import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUploadFile } from '@/lib/uploadValidation';

const MESSAGE_FILES_BUCKET = 'case-documents';
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

/** 案件へのアクセス権（顧客＝申請者グループ / 紹介者・メンバー＝case_members / 専門家＝担当グループ） */
async function checkCaseAccess(caseId: string, userId: string) {
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id, user_group_id, expert_group_id')
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) return { allowed: false as const, caseData: null };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: false as const, caseData: null };

  const userType = profile.user_type ?? '';
  if (userType === 'member' || userType === 'introducer') {
    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle();
    return { allowed: !!memberRow, caseData: caseData };
  }

  const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
  const hasAccess =
    profile.group_id === caseData.expert_group_id ||
    profile.group_id === caseData.user_group_id ||
    profile.id === caseData.user_group_id ||
    (caseData.expert_group_id == null && isExpertRole);

  return { allowed: hasAccess, caseData };
}

/**
 * 顧客がメッセージを送ったときに、メッセージ受信通知ONの専門家にメール/LINEで通知する
 */
async function notifyExpertsOnCustomerMessage(
  caseId: number,
  messageId: number,
  senderName: string
) {
  const { data: caseRow } = await supabaseAdmin
    .from('cases')
    .select('title, expert_group_id')
    .eq('id', caseId)
    .single();
  if (!caseRow?.expert_group_id) return;

  const { data: expertProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, line_id')
    .or(`group_id.eq.${caseRow.expert_group_id},id.eq.${caseRow.expert_group_id}`);
  if (!expertProfiles?.length) return;

  const expertIds = expertProfiles.map((p) => p.id);
  const { data: settingsRows } = await supabaseAdmin
    .from('notification_settings')
    .select('user_id, message_notification')
    .in('user_id', expertIds);
  const optedOut = new Set(
    (settingsRows ?? []).filter((r) => r.message_notification === false).map((r) => r.user_id)
  );
  const recipients = expertProfiles.filter((p) => !optedOut.has(p.id));

  const caseTitle = caseRow.title || `案件${caseId}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hojonet.vercel.app';
  const caseUrl = `${baseUrl}/dashboard/cases/${caseId}`;
  const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
  const fromEmail = fromRaw.includes('<') ? fromRaw : `補助NET <${fromRaw}>`;

  if (resend) {
    for (const p of recipients) {
      if (!p.email?.trim()) continue;
      await resend.emails.send({
        from: fromEmail,
        to: p.email.trim(),
        subject: `【補助NET】${senderName}様からメッセージが届きました`,
        html: `
          <p>${p.full_name || '専門家'} 様</p>
          <p>${senderName}様から案件「${caseTitle}」でメッセージが届きました。</p>
          <p><a href="${caseUrl}">案件のメッセージを確認する</a></p>
        `,
      });
    }
  }

  const lineToken = process.env.LINE_MESSAGING_ACCESS_TOKEN;
  if (lineToken) {
    for (const p of recipients) {
      if (!p.line_id) continue;
      const text = `【補助NET】${senderName}様からメッセージが届きました\n案件: ${caseTitle}\n${caseUrl}`;
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lineToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: p.line_id,
          messages: [{ type: 'text', text }],
        }),
      });
    }
  }
}

/**
 * GET: 案件のメッセージ一覧を取得（送信者プロフィール付き）
 */
export async function GET(
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

    const { data: rows, error } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        sender_id,
        content,
        is_system_message,
        created_at
      `)
      .eq('case_id', caseIdNum)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Messages fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id).filter(Boolean))] as string[];
    const { data: profiles } = senderIds.length
      ? await supabaseAdmin
          .from('profiles')
          .select('id, full_name, company_name, user_type')
          .in('id', senderIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const messageIds = (rows ?? []).map((m) => m.id);
    const { data: attachmentRows, error: attachErr } = messageIds.length
      ? await supabaseAdmin
          .from('message_attachments')
          .select('id, message_id, file_name, file_path, file_size')
          .in('message_id', messageIds)
      : { data: [] as { id: number; message_id: number; file_name: string; file_path: string; file_size: string | null }[], error: null };
    if (attachErr) {
      console.error('message_attachments select error:', attachErr);
    }
    const attachmentsByMessageId = new Map<number, { id: number; file_name: string; file_path: string; file_size: string | null }[]>();
    for (const a of attachmentRows ?? []) {
      const msgId = (a as { message_id?: number }).message_id ?? (a as { messageId?: number }).messageId;
      if (msgId == null) continue;
      const list = attachmentsByMessageId.get(Number(msgId)) ?? [];
      const name = (a as { file_name?: string }).file_name ?? (a as { fileName?: string }).fileName ?? '';
      const path = (a as { file_path?: string }).file_path ?? (a as { filePath?: string }).filePath ?? '';
      const size = (a as { file_size?: string | null }).file_size ?? (a as { fileSize?: string | null }).fileSize ?? null;
      list.push({ id: (a as { id: number }).id, file_name: name, file_path: path, file_size: size ?? null });
      attachmentsByMessageId.set(Number(msgId), list);
    }

    const messages = (rows ?? []).map((m) => {
      const sender = m.sender_id ? profileMap.get(m.sender_id) : null;
      const isExpert = sender && ['expert', 'assistant', 'admin'].includes(sender.user_type ?? '');
      return {
        id: m.id,
        sender_id: m.sender_id,
        sender_name: sender?.full_name || sender?.company_name || '不明',
        sender_initial: (sender?.full_name || sender?.company_name || '?').trim().charAt(0),
        is_expert: isExpert,
        is_mine: m.sender_id === user.id,
        content: m.content,
        is_system_message: m.is_system_message ?? false,
        created_at: m.created_at,
        attachments: attachmentsByMessageId.get(m.id) ?? [],
      };
    });

    // 未読数: 自分以外が送ったメッセージのうち、未既読の数
    const fromOthers = (rows ?? []).filter((m) => m.sender_id !== user.id).map((m) => m.id);
    let unread_count = fromOthers.length;
    if (fromOthers.length > 0) {
      const { data: readRows } = await supabaseAdmin
        .from('message_read_status')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', fromOthers);
      const readSet = new Set((readRows ?? []).map((r) => r.message_id));
      unread_count = fromOthers.filter((id) => !readSet.has(id)).length;
    }

    return NextResponse.json({ messages, unread_count });
  } catch (e) {
    console.error('Messages GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * POST: メッセージを送信
 * Body: JSON { content: string } または FormData { content: string, file?: File }
 */
export async function POST(
  request: Request,
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

    const contentType = request.headers.get('content-type') ?? '';
    let content: string;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const contentPart = formData.get('content');
      content = (typeof contentPart === 'string' ? contentPart : '').trim();
      const filePart = formData.get('file');
      if (filePart instanceof File && filePart.size > 0) {
        file = filePart;
      }
    } else {
      const body = await request.json();
      content = typeof body.content === 'string' ? body.content.trim() : '';
    }

    if (!content && !file) {
      return NextResponse.json({ error: '本文またはファイルを入力してください。' }, { status: 400 });
    }

    if (file) {
      const validation = validateUploadFile(file);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('messages')
      .insert({
        case_id: caseIdNum,
        sender_id: user.id,
        content,
        is_system_message: false,
      })
      .select('id, sender_id, content, created_at')
      .single();

    if (error) {
      console.error('Message insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${caseId}/messages/${inserted.id}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(MESSAGE_FILES_BUCKET)
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
      if (uploadError) {
        console.error('Message attachment upload error:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      const sizeKB = Math.round(file.size / 1024);
      const fileSizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
      const { error: attachError } = await supabaseAdmin.from('message_attachments').insert({
        message_id: inserted.id,
        file_name: file.name,
        file_path: path,
        file_size: fileSizeStr,
      });
      if (attachError) {
        console.error('message_attachments insert error:', attachError);
        return NextResponse.json({ error: '添付の保存に失敗しました。' }, { status: 500 });
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type, full_name')
      .eq('id', user.id)
      .single();
    const isExpertRole = profile && ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const isCustomerSide = !isExpertRole;
    await supabaseAdmin.from('activity_logs').insert({
      case_id: caseIdNum,
      actor_id: isCustomerSide ? null : user.id,
      action_type: 'message_sent',
      description: isCustomerSide ? '顧客がメッセージを送信しました' : 'メッセージを送信しました',
      target_type: 'case',
      target_id: caseIdNum,
      target_value: null,
    });

    if (isCustomerSide) {
      notifyExpertsOnCustomerMessage(caseIdNum, inserted.id, profile?.full_name ?? 'お客様').catch((e) => {
        console.error('[messages] notifyExpertsOnCustomerMessage error:', e);
      });
    }

    return NextResponse.json({ message: inserted });
  } catch (e) {
    console.error('Messages POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
