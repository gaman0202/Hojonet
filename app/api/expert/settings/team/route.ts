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

/** GET: チームメンバー一覧を取得 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const groupId = profile.group_id || profile.id;

    // 同じ group_id を持つメンバー（assistant または expert）を取得
    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, user_type')
      .eq('group_id', groupId)
      .in('user_type', ['expert', 'assistant']);

    if (membersError) {
      console.error('Members fetch error:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const teamMembers = (members || []).map((m, idx) => {
      const isExpert = m.user_type === 'expert';
      return {
        id: m.id,
        name: m.full_name || m.email?.split('@')[0] || 'Unknown',
        email: m.email || '',
        role: isExpert ? 'administrative-scrivener' as const : 'assistant' as const,
        avatarColor: isExpert ? '#9810FA' : '#155DFC',
        avatarBgColor: isExpert ? '#F3E8FF' : '#DBEAFE',
        roleColor: isExpert ? '#8200DB' : '#1447E6',
        roleBgColor: isExpert ? '#F3E8FF' : '#DBEAFE',
      };
    });

    return NextResponse.json({ members: teamMembers });
  } catch (e) {
    console.error('GET team members error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** POST: チームメンバーを招待 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, message } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'メールアドレスは必須です。' }, { status: 400 });
    }

    // 전문가의 경우 group_id는 자신의 id (customer와 동일한 패턴)
    const groupId = profile.group_id || profile.id;
    const userType = role === 'administrative-scrivener' ? 'expert' : 'assistant';
    const emailLower = email.trim().toLowerCase();

    if (!emailLower) {
      return NextResponse.json({ error: 'メールアドレスは必須です。' }, { status: 400 });
    }

    // email_invites 테이블에 추가
    // 전문가 팀 초대의 경우 case_id는 NULL이 필요하지만, 현재 스키마는 NOT NULL
    // 일단은 기존 email_invites를 사용하되, case_id는 임시로 처리
    // TODO: 전문가 팀 초대를 위해 case_id NULL 허용 마이그레이션 필요
    
    // 현재 스키마 제약조건:
    // - case_id: NOT NULL (하지만 전문가 팀 초대는 case와 무관)
    // - role: 'member' | 'introducer'만 허용 (하지만 전문가 팀은 'expert' | 'assistant' 필요)
    // 
    // 임시 해결책: case_id를 NULL로 허용하도록 마이그레이션 필요
    // 또는 전문가 팀 초대를 위한 별도 테이블 생성
    
    // 일단은 inviter_id를 사용하고, case_id는 NULL 허용 마이그레이션을 가정
    // 마이그레이션이 적용되기 전까지는 에러가 발생할 수 있음
    
    const { data: inserted, error: inviteError } = await supabaseAdmin
      .from('email_invites')
      .insert({
        email: emailLower,
        inviter_id: user.id,
        case_id: null, // 전문가 팀 초대는 case와 무관하므로 NULL
        role: userType, // 'expert' 또는 'assistant' - 스키마 제약조건 수정 필요
        group_id: groupId,
      })
      .select('id, email, role, created_at')
      .single();

    if (inviteError) {
      console.error('Invite error:', inviteError);
      console.error('Invite error details:', JSON.stringify(inviteError, null, 2));
      console.error('Attempted insert:', {
        email: emailLower,
        inviter_id: user.id,
        case_id: null,
        role: userType,
        group_id: groupId,
      });
      return NextResponse.json({ 
        error: inviteError.message,
        details: inviteError.details || inviteError.hint || 'Database constraint violation',
        code: inviteError.code,
      }, { status: 500 });
    }

    // Resend API でメール送信
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(emailLower)}`;

    if (!resend) {
      console.warn('Resend API key not configured');
      console.warn('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set (hidden)' : 'Not set');
      return NextResponse.json(
        {
          error: 'メール送信に失敗しました',
          detail: 'Resend APIが設定されていません',
          invite: inserted,
        },
        { status: 500 }
      );
    }

    const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
    const fromEmail = fromRaw.includes('<') ? fromRaw : `Hojonet <${fromRaw}>`;
    
    console.log('Attempting to send email:', {
      from: fromEmail,
      to: emailLower,
      subject: 'チーム招待のお知らせ',
      registerUrl,
    });

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: emailLower,
      subject: 'チーム招待のお知らせ',
      html: `
        <p>専門家チームのメンバーとして招待されました。</p>
        <p>以下のリンクから会員登録を行ってください。</p>
        <p><a href="${registerUrl}">${registerUrl}</a></p>
        ${message && message.trim() ? `<p>メッセージ: ${message}</p>` : ''}
      `,
    });

    if (sendError) {
      console.error('Resend send error:', sendError);
      console.error('Resend error details:', JSON.stringify(sendError, null, 2));
      const errorMessage = sendError?.message ?? 'Unknown error';
      return NextResponse.json(
        {
          error: 'メール送信に失敗しました',
          detail: errorMessage,
          invite: inserted,
        },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', sendData);

    return NextResponse.json({ success: true, message: 'Invitation sent', invite: inserted });
  } catch (e) {
    console.error('POST team invite error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** DELETE: チームメンバーを削除 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('id');

    if (!memberId) {
      return NextResponse.json({ error: 'メンバーIDは必須です。' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const groupId = profile.group_id || profile.id;

    // 同じ group_id の 멤버인지 확인
    const { data: member } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', memberId)
      .eq('group_id', groupId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つからないか、チームに属していません。' }, { status: 404 });
    }

    // 자신은 삭제할 수 없음
    if (memberId === user.id) {
      return NextResponse.json({ error: '自分自身を削除することはできません。' }, { status: 400 });
    }

    // 멤버의 group_id를 null로 설정 (팀에서 제거)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ group_id: null })
      .eq('id', memberId);

    if (updateError) {
      console.error('Remove member error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE team member error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
