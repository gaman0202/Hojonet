import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as { path?: string })
          );
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/**
 * GET: この補助金についてログインユーザーが既に相談している担当専門家のIDを返す。
 * 案件が存在し assignee_id があればその専門家IDを返す。未ログインまたは該当案件がなければ null。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ assigneeId: null });
    }

    const { id } = await params;
    const subsidyId = parseInt(id, 10);
    if (!id || isNaN(subsidyId)) {
      return NextResponse.json({ assigneeId: null });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ assigneeId: null });
    }

    const groupId = profile.group_id ?? profile.id;
    const userType = (profile as { user_type?: string }).user_type;

    let assigneeId: string | null = null;

    if (userType === 'member' || userType === 'introducer') {
      const { data: memberRows } = await supabaseAdmin
        .from('case_members')
        .select('case_id')
        .eq('user_id', profile.id);
      const caseIds = [...new Set((memberRows || []).map((r: { case_id: number }) => r.case_id))];
      if (caseIds.length === 0) {
        return NextResponse.json({ assigneeId: null });
      }
      const { data: caseRows } = await supabaseAdmin
        .from('cases')
        .select('assignee_id')
        .in('id', caseIds)
        .eq('subsidy_id', subsidyId)
        .neq('status', 'rejected')
        .limit(1);
      const row = Array.isArray(caseRows) && caseRows.length > 0 ? caseRows[0] : null;
      assigneeId = (row as { assignee_id: string | null } | null)?.assignee_id ?? null;
    } else {
      const { data: caseRows } = await supabaseAdmin
        .from('cases')
        .select('assignee_id')
        .eq('user_group_id', groupId)
        .eq('subsidy_id', subsidyId)
        .neq('status', 'rejected')
        .order('updated_at', { ascending: false })
        .limit(1);
      const row = Array.isArray(caseRows) && caseRows.length > 0 ? caseRows[0] : null;
      assigneeId = (row as { assignee_id: string | null } | null)?.assignee_id ?? null;
    }

    return NextResponse.json({ assigneeId });
  } catch (e) {
    console.error('Consulting expert fetch error:', e);
    return NextResponse.json({ assigneeId: null });
  }
}
