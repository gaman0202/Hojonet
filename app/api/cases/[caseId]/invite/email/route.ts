import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
 * POST: メール招待を登録する（email_invites に email + role + group_id を保存）
 * Body: { email: string, role: 'member' | 'introducer' }
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role === 'introducer' ? 'introducer' : 'member';

    if (!email) return NextResponse.json({ error: 'メールアドレスは必須です。' }, { status: 400 });

    const { data: inserted, error } = await supabaseAdmin
      .from('email_invites')
      .insert({
        email,
        inviter_id: user.id,
        case_id: caseIdNum,
        role,
        group_id: profile.group_id,
      })
      .select('id, email, role, created_at')
      .single();

    if (error) {
      console.error('email_invites insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Resend API でメール送信（リンクに email を query パラメータで含める）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(email)}`;

    if (resend) {
      // 送信元: 環境変数 RESEND_FROM_EMAIL または検証済みドメインのデフォルト
      const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
      const fromEmail = fromRaw.includes('<') ? fromRaw : `Hojonet <${fromRaw}>`;
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: '招待のお知らせ',
        html: `
          <p>案件メンバーとして招待されました。</p>
          <p>以下のリンクから会員登録を行ってください。</p>
          <p><a href="${registerUrl}">${registerUrl}</a></p>
        `,
      });
      if (sendError) {
        console.error('Resend send error:', sendError);
        const message = sendError?.message ?? 'Unknown error';
        return NextResponse.json(
          {
            error: '招待の登録は完了しましたが、メール送信に失敗しました。',
            detail: message,
            invite: inserted,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, invite: inserted });
  } catch (e) {
    console.error('Invite email POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
