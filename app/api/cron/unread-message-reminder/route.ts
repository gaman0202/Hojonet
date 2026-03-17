// app/api/cron/unread-message-reminder/route.ts
// 専門家から送られたメッセージが未読の顧客に、1時間ごとにメール/LINEでリマインダーを送る

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runUnreadMessageReminder();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runUnreadMessageReminder();
}

async function runUnreadMessageReminder() {
  if (!resend) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not set', sent: 0 },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hojonet.vercel.app';
  const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
  const fromEmail = fromRaw.includes('<') ? fromRaw : `補助NET <${fromRaw}>`;

  // 1) 全メッセージを案件・送信者付きで取得
  const { data: messagesRaw, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('id, case_id, sender_id, created_at')
    .eq('is_system_message', false);

  if (msgError || !messagesRaw?.length) {
    return NextResponse.json({ ok: true, sent: 0, lineSent: 0, message: 'No messages' });
  }

  const caseIds = [...new Set(messagesRaw.map((m) => m.case_id))];
  const { data: casesData } = await supabaseAdmin
    .from('cases')
    .select('id, title, user_group_id, expert_group_id')
    .in('id', caseIds);

  const caseMap = new Map((casesData ?? []).map((c) => [c.id, c]));

  // 送信者が専門家かどうか: 案件の expert_group_id に属するか
  const expertSenderByCase = new Map<number, Set<string>>();
  for (const m of messagesRaw) {
    const c = caseMap.get(m.case_id);
    if (!c?.expert_group_id || !m.sender_id) continue;
    if (!expertSenderByCase.has(m.case_id)) {
      expertSenderByCase.set(m.case_id, new Set());
    }
    expertSenderByCase.get(m.case_id)!.add(m.sender_id);
  }

  const senderIds = [...new Set(messagesRaw.map((m) => m.sender_id).filter(Boolean))] as string[];
  const { data: senderProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, group_id')
    .in('id', senderIds);

  const senderGroupMap = new Map((senderProfiles ?? []).map((p) => [p.id, p.group_id]));

  // 専門家送信メッセージのみに絞る（送信者がその案件の expert_group に属する）
  const expertMessages = messagesRaw.filter((m) => {
    const c = caseMap.get(m.case_id);
    if (!c?.expert_group_id || !m.sender_id) return false;
    const senderGroup = senderGroupMap.get(m.sender_id);
    return senderGroup === c.expert_group_id || m.sender_id === c.expert_group_id;
  });

  if (expertMessages.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, lineSent: 0, message: 'No expert messages' });
  }

  // 2) 未読の「顧客側ユーザー」を集める: (user_id, case_id) -> 未読件数
  const unreadByUserCase = new Map<string, Map<number, number>>();

  for (const m of expertMessages) {
    const c = caseMap.get(m.case_id);
    if (!c?.user_group_id) continue;

    const { data: customerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`group_id.eq.${c.user_group_id},id.eq.${c.user_group_id}`)
      .neq('user_type', 'introducer');

    const { data: members } = await supabaseAdmin
      .from('case_members')
      .select('user_id')
      .eq('case_id', m.case_id);

    const customerUserIds = new Set<string>();
    for (const p of customerProfiles ?? []) customerUserIds.add(p.id);
    for (const row of members ?? []) customerUserIds.add(row.user_id);

    const { data: readRows } = await supabaseAdmin
      .from('message_read_status')
      .select('user_id')
      .eq('message_id', m.id);

    const readUserIds = new Set((readRows ?? []).map((r) => r.user_id));

    for (const uid of customerUserIds) {
      if (readUserIds.has(uid)) continue;
      if (!unreadByUserCase.has(uid)) {
        unreadByUserCase.set(uid, new Map());
      }
      const perCase = unreadByUserCase.get(uid)!;
      perCase.set(m.case_id, (perCase.get(m.case_id) ?? 0) + 1);
    }
  }

  if (unreadByUserCase.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, lineSent: 0, message: 'No unread recipients' });
  }

  // メッセージ受信通知 = 専門家が顧客からメッセージを受け取ったときに通知（専門家向け）。
  // このcronは「専門家→顧客の未読リマインダー」なので、message_notification トグルは使わない。

  const userIds = [...unreadByUserCase.keys()];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, line_id')
    .in('id', userIds);

  const emailToCases = new Map<string, { fullName: string; cases: { caseId: number; caseTitle: string; unreadCount: number }[] }>();
  const lineToCases = new Map<string, { fullName: string; lineId: string; cases: { caseId: number; caseTitle: string; unreadCount: number }[] }>();

  for (const p of profiles ?? []) {
    const perCase = unreadByUserCase.get(p.id);
    if (!perCase || perCase.size === 0) continue;

    const cases = Array.from(perCase.entries()).map(([caseId, unreadCount]) => ({
      caseId,
      caseTitle: caseMap.get(caseId)?.title ?? '',
      unreadCount,
    }));

    if (p.email?.trim()) {
      emailToCases.set(p.email.trim(), { fullName: p.full_name ?? '', cases });
    }
    if (p.line_id) {
      lineToCases.set(p.line_id, { fullName: p.full_name ?? '', lineId: p.line_id, cases });
    }
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const emailLog: { to: string; ok: boolean; error?: string }[] = [];
  let sentCount = 0;
  let isFirstEmail = true;
  for (const [to, { fullName, cases }] of emailToCases) {
    if (!isFirstEmail) await sleep(600);
    isFirstEmail = false;

    const caseList = cases
      .map((c) => `・<a href="${baseUrl}/dashboard/cases/${c.caseId}">${c.caseTitle || `案件${c.caseId}`}</a>（未読${c.unreadCount}件）`)
      .join('<br/>');
    const subject = `【補助NET】専門家からの未読メッセージがあります（${cases.length}件の案件）`;
    const html = `
      <p>${fullName || 'お客様'} 様</p>
      <p>専門家から新しいメッセージが届いています。以下の案件で未読があります。</p>
      <p>${caseList}</p>
      <p><a href="${baseUrl}/dashboard/cases">案件一覧へ</a></p>
    `;
    const { error: sendError } = await resend!.emails.send({
      from: fromEmail,
      to: to,
      subject,
      html,
    });
    if (!sendError) {
      sentCount += 1;
      emailLog.push({ to, ok: true });
      console.log('[unread-message-reminder] email sent:', to);
    } else {
      const errMsg = String(sendError?.message ?? sendError);
      emailLog.push({ to, ok: false, error: errMsg });
      console.error('[unread-message-reminder] email error', to, sendError);
    }
  }

  const lineToken = process.env.LINE_MESSAGING_ACCESS_TOKEN;
  const lineLog: { lineId: string; ok: boolean; error?: string }[] = [];
  let lineSentCount = 0;
  if (lineToken) {
    for (const { fullName, lineId, cases } of lineToCases.values()) {
      const caseList = cases
        .map((c) => `・${c.caseTitle || `案件${c.caseId}`}（未読${c.unreadCount}件）`)
        .join('\n');
      const message = `【補助NET】専門家からの未読メッセージがあります（${cases.length}件の案件）

${fullName || 'お客様'}様
以下の案件で未読メッセージがあります。

${caseList}

${baseUrl}/dashboard/cases`;
      try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lineToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: lineId,
            messages: [{ type: 'text', text: message }],
          }),
        });
        if (res.ok) {
          lineSentCount += 1;
          lineLog.push({ lineId, ok: true });
          console.log('[unread-message-reminder] LINE sent:', lineId);
        } else {
          const body = await res.text();
          lineLog.push({ lineId, ok: false, error: `${res.status}: ${body}` });
          console.error('[unread-message-reminder] LINE error', res.status, body);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        lineLog.push({ lineId, ok: false, error: errMsg });
        console.error('[unread-message-reminder] LINE request error', e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    lineSent: lineSentCount,
    recipients: emailToCases.size,
    lineRecipients: lineToCases.size,
    emailLog,
    lineLog,
  });
}
