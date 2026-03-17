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
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as { path?: string });
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function checkCaseAccess(caseId: string, userId: string) {
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id, user_group_id, expert_group_id')
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) return { allowed: false as const };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: false as const };

  const userType = profile.user_type ?? '';
  if (userType === 'member' || userType === 'introducer') {
    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle();
    return { allowed: !!memberRow };
  }

  const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
  const hasAccess =
    profile.group_id === caseData.expert_group_id ||
    profile.group_id === caseData.user_group_id ||
    profile.id === caseData.user_group_id ||
    (caseData.expert_group_id == null && isExpertRole);

  return { allowed: hasAccess };
}

/**
 * POST: この案件の他者からのメッセージをすべて既読にする
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const { data: rows } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('case_id', caseIdNum)
      .neq('sender_id', user.id);

    const fromOthers = (rows ?? []).map((m) => m.id);
    if (fromOthers.length === 0) {
      return NextResponse.json({ marked: 0 });
    }

    const { data: existing } = await supabaseAdmin
      .from('message_read_status')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', fromOthers);

    const alreadyRead = new Set((existing ?? []).map((r) => r.message_id));
    const toInsert = fromOthers.filter((id) => !alreadyRead.has(id));
    if (toInsert.length === 0) {
      return NextResponse.json({ marked: 0 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('message_read_status')
      .insert(
        toInsert.map((message_id) => ({
          message_id,
          user_id: user.id,
        }))
      );

    if (insertError) {
      console.error('Mark read insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ marked: toInsert.length });
  } catch (e) {
    console.error('Mark read POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
