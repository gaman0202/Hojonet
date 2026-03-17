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
 * POST: 専門家が「この補助金の案件に参加する」＝担当可能な補助金として登録
 * expert_subsidy_configs に (expert_id, subsidy_id) を upsert
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ subsidyId: string }> }
) {
  try {
    const { subsidyId } = await params;
    const subsidyIdNum = parseInt(subsidyId, 10);
    if (isNaN(subsidyIdNum)) {
      return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpert = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpert) {
      return NextResponse.json({ error: '専門家のみ参加できます' }, { status: 403 });
    }

    const { data: subsidy } = await supabaseAdmin
      .from('subsidies')
      .select('id')
      .eq('id', subsidyIdNum)
      .single();

    if (!subsidy) {
      return NextResponse.json({ error: '補助金が見つかりません' }, { status: 404 });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .upsert(
        {
          expert_id: user.id,
          subsidy_id: subsidyIdNum,
        },
        { onConflict: 'expert_id,subsidy_id' }
      );

    if (upsertError) {
      console.error('Expert participate upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Expert participate POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
