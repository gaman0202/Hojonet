import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

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

/**
 * POST: 招待トークンを生成し、招待リンクURLを返す
 * Body: { role: 'member' | 'introducer' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });

    // 招待者のプロフィールを取得（group_id を持っている）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const body = await request.json();
    const role = body.role === 'introducer' ? 'introducer' : 'member';

    // ランダムトークン生成（48文字、URL-safe）
    const token = crypto.randomBytes(32).toString('base64url');

    const { data: inserted, error } = await supabaseAdmin
      .from('invite_tokens')
      .insert({
        token,
        inviter_id: user.id,
        case_id: caseIdNum,
        role,
        group_id: profile.group_id,
      })
      .select('id, token, role, expires_at')
      .single();

    if (error) {
      console.error('invite_tokens insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 招待リンクURL生成
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/register?invite=${token}`;

    return NextResponse.json({ invite: inserted, url: inviteUrl });
  } catch (e) {
    console.error('Invite POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * GET: トークン情報を検証して返す（会員登録ページ用）
 * Query: ?token=xxxxx
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
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

    return NextResponse.json({
      valid: true,
      role: row.role,
      group_id: row.group_id,
      case_id: row.case_id,
    });
  } catch (e) {
    console.error('Invite GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
