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
        getAll() { return cookieStore.getAll(); },
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/**
 * PATCH: 専門家がヒアリング回答を「確認済み」にする
 * Body: { comment?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id')
      .eq('id', caseIdNum)
      .single();
    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isExpert =
      profile.group_id === caseRow.expert_group_id ||
      profile.id === caseRow.expert_group_id ||
      (['expert', 'assistant', 'admin'].includes(profile.user_type ?? '') && caseRow.expert_group_id == null);
    if (!isExpert) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    const { data: existing } = await supabaseAdmin
      .from('case_hearing_submissions')
      .select('case_id')
      .eq('case_id', caseIdNum)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('case_hearing_submissions')
        .update({
          reviewed_at: now,
          review_comment: comment || null,
          reviewer_id: user.id,
        })
        .eq('case_id', caseIdNum);

      if (updateError) {
        console.error('Hearing review update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'レビューするヒアリング提出がありません。' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reviewedAt: now });
  } catch (e) {
    console.error('Hearing review PATCH error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
