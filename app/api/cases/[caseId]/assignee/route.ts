import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * GET: 案件の担当者名を取得（RLSで profiles が読めない場合に使用）
 * 案件の user_group に属するユーザーのみ取得可能
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (Number.isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();
    const userGroupId = profile?.group_id ?? profile?.id ?? user.id;

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id, assignee_id, expert_group_id')
      .eq('id', caseIdNum)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isOwner =
      caseRow.user_group_id === user.id ||
      caseRow.user_group_id === userGroupId ||
      caseRow.user_group_id === profile?.group_id;
    if (!isOwner) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const assigneeId = (caseRow as { assignee_id?: string | null }).assignee_id;
    const expertGroupId = (caseRow as { expert_group_id?: string | null }).expert_group_id;

    if (assigneeId) {
      const { data: assigneeProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', assigneeId)
        .maybeSingle();
      const name = assigneeProfile?.full_name?.trim() || null;
      return NextResponse.json({ assigneeName: name });
    }

    if (expertGroupId) {
      const { data: expertProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .or(`id.eq.${expertGroupId},group_id.eq.${expertGroupId}`)
        .limit(1)
        .maybeSingle();
      const name = expertProfile?.full_name?.trim() || null;
      return NextResponse.json({ assigneeName: name });
    }

    return NextResponse.json({ assigneeName: null });
  } catch (e) {
    console.error('Cases assignee GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
