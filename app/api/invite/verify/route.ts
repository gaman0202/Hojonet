import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * GET: 招待トークンを検証して情報を返す（会員登録ページ用）
 * Query: ?token=xxxxx
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'トークンは必須です。' }, { status: 400 });

    const { data: row, error } = await supabaseAdmin
      .from('invite_tokens')
      .select('id, token, role, group_id, case_id, used_by, expires_at, inviter_id')
      .eq('token', token)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'トークンが無効です。' }, { status: 404 });
    }

    if (row.used_by) {
      return NextResponse.json({ error: 'トークンは既に使用されています。' }, { status: 410 });
    }

    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'トークンの有効期限が切れています。' }, { status: 410 });
    }

    // 招待者の名前を取得
    const { data: inviter } = await supabaseAdmin
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', row.inviter_id)
      .single();

    return NextResponse.json({
      valid: true,
      role: row.role,
      group_id: row.group_id,
      case_id: row.case_id,
      inviter_name: inviter?.full_name ?? inviter?.company_name ?? '',
    });
  } catch (e) {
    console.error('Invite verify error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
