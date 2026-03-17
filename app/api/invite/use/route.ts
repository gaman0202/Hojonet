import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * POST: 招待トークンを使用済みにする（会員登録完了後に呼ぶ）
 * Body: { token: string, user_id: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, user_id } = body;
    if (!token || !user_id) {
      return NextResponse.json({ error: 'token と user_id は必須です。' }, { status: 400 });
    }

    const { data: row } = await supabaseAdmin
      .from('invite_tokens')
      .select('id, used_by, case_id')
      .eq('token', token)
      .single();

    if (!row) return NextResponse.json({ error: 'トークンが無効です。' }, { status: 404 });
    if (row.used_by) return NextResponse.json({ error: '既に使用されています。' }, { status: 410 });

    // トークンを使用済みにする
    await supabaseAdmin
      .from('invite_tokens')
      .update({ used_by: user_id, used_at: new Date().toISOString() })
      .eq('token', token);

    // 案件メンバーに追加（case_members テーブル）
    await supabaseAdmin.from('case_members').insert({
      case_id: row.case_id,
      user_id,
      role: 'member',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Invite use error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
