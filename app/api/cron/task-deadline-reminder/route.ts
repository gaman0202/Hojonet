// app/api/cron/task-deadline-reminder/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** タスク期限の何日以内を「間近」とするか */
const DEADLINE_DAYS = 3;

/** 通知対象外のタスクステータス */
const EXCLUDED_STATUSES = ['approved', 'completed'];

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

  return runTaskDeadlineReminder();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runTaskDeadlineReminder();
}

async function runTaskDeadlineReminder() {
  if (!resend) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not set', sent: 0 },
      { status: 500 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineEnd = new Date(today);
  deadlineEnd.setDate(deadlineEnd.getDate() + DEADLINE_DAYS);
  const deadlineEndStr = deadlineEnd.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const { data: tasksRaw, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select(`
      id,
      title,
      deadline,
      case_id,
      assignee_id,
      assignee_role,
      status,
      case:cases!tasks_case_id_fkey(id, title, user_group_id, expert_group_id)
    `)
    .gte('deadline', todayStr)
    .lte('deadline', deadlineEndStr);

  if (tasksError) {
    console.error('[task-deadline-reminder] tasks fetch error', tasksError);
    return NextResponse.json({ error: tasksError.message, sent: 0 }, { status: 500 });
  }

  const tasks = (tasksRaw ?? []).filter(
    (t) => t.status && !EXCLUDED_STATUSES.includes(t.status)
  );
  if (tasks.length === 0) {
    console.log('[task-deadline-reminder] No tasks due in the next', DEADLINE_DAYS, 'days');
    return NextResponse.json({ ok: true, sent: 0, message: 'No tasks due' });
  }
  console.log('[task-deadline-reminder] Found', tasks.length, 'tasks due within', DEADLINE_DAYS, 'days');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hojonet.vercel.app';
  const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
  const fromEmail = fromRaw.includes('<') ? fromRaw : `補助NET <${fromRaw}>`;

  type TaskItem = { title: string; deadline: string; caseTitle: string; caseId: number; taskId: number };
  const userToData = new Map<string, { email?: string; lineId?: string; fullName: string; items: TaskItem[] }>();

  function addRecipient(userId: string, profile: { email?: string | null; full_name?: string | null; line_id?: string | null }, item: TaskItem) {
    let entry = userToData.get(userId);
    if (!entry) {
      entry = {
        email: profile.email?.trim() || undefined,
        lineId: profile.line_id ?? undefined,
        fullName: profile.full_name ?? '',
        items: [],
      };
      userToData.set(userId, entry);
    }
    entry.items.push(item);
  }

  for (const task of tasks) {
    const caseRel = task.case as { id: number; title: string | null; user_group_id: string; expert_group_id: string | null } | { id: number; title: string | null; user_group_id: string; expert_group_id: string | null }[] | null;
    const caseRow = Array.isArray(caseRel) ? caseRel[0] ?? null : caseRel;
    const caseTitle = caseRow?.title ?? '';
    const caseId = caseRow?.id ?? task.case_id;
    const deadlineStr = typeof task.deadline === 'string' ? task.deadline : '';
    const item: TaskItem = {
      title: task.title ?? '',
      deadline: deadlineStr,
      caseTitle,
      caseId,
      taskId: task.id,
    };

    let added = false;

    if (task.assignee_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, line_id')
        .eq('id', task.assignee_id)
        .maybeSingle();
      if (profile?.id && (profile.email?.trim() || profile.line_id)) {
        addRecipient(profile.id, profile, item);
        added = true;
      }
    }

    if (!added) {
      const role = task.assignee_role ?? 'customer';
      if (role === 'expert' || role === 'assistant') {
        if (caseRow?.expert_group_id) {
          const { data: expertProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, line_id')
            .or(`group_id.eq.${caseRow.expert_group_id},id.eq.${caseRow.expert_group_id}`);
          for (const p of expertProfiles ?? []) {
            if (p.id && (p.email?.trim() || p.line_id)) {
              addRecipient(p.id, p, item);
              added = true;
            }
          }
        }
      } else {
        if (caseRow?.user_group_id) {
          const { data: groupProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, line_id')
            .eq('group_id', caseRow.user_group_id)
            .neq('user_type', 'introducer');
          for (const p of groupProfiles ?? []) {
            if (p.id && (p.email?.trim() || p.line_id)) {
              addRecipient(p.id, p, item);
              added = true;
            }
          }
        }
      }
    }
  }

  const recipientUserIds = [...userToData.keys()];
  let allowedUserIds = new Set<string>(recipientUserIds);
  if (recipientUserIds.length > 0) {
    const { data: settingsRows } = await supabaseAdmin
      .from('notification_settings')
      .select('user_id, deadline_reminder')
      .in('user_id', recipientUserIds);
    allowedUserIds = new Set(
      recipientUserIds.filter((uid) => {
        const row = settingsRows?.find((r) => r.user_id === uid);
        return row === undefined || row.deadline_reminder !== false;
      })
    );
  }

  const emailToTasks = new Map<string, { fullName: string; items: TaskItem[] }>();
  const lineMessagingToTasks = new Map<string, { fullName: string; lineId: string; items: TaskItem[] }>();
  for (const uid of allowedUserIds) {
    const data = userToData.get(uid);
    if (!data) continue;
    if (data.email) {
      const existing = emailToTasks.get(data.email);
      if (existing) {
        existing.items.push(...data.items);
      } else {
        emailToTasks.set(data.email, { fullName: data.fullName, items: [...data.items] });
      }
    }
    if (data.lineId) {
      const existing = lineMessagingToTasks.get(data.lineId);
      if (existing) {
        existing.items.push(...data.items);
      } else {
        lineMessagingToTasks.set(data.lineId, { fullName: data.fullName, lineId: data.lineId, items: [...data.items] });
      }
    }
  }

  if (emailToTasks.size === 0 && lineMessagingToTasks.size === 0) {
    console.warn('[task-deadline-reminder] Tasks found but no recipients (check case relation / assignee)');
    return NextResponse.json({ ok: true, sent: 0, message: 'No recipients for tasks', taskCount: tasks.length });
  }

  let sentCount = 0;
  // 이메일 발송
  for (const [to, { fullName, items }] of emailToTasks) {
    const taskListHtml = items
      .map(
        (i) =>
          `<li><a href="${baseUrl}/dashboard/cases/${i.caseId}">${i.caseTitle}</a>：${i.title}（期限: ${i.deadline}）</li>`
      )
      .join('');
    const subject = `【補助NET】タスクの期限が近づいています（${items.length}件）`;
    const html = `
      <p>${fullName || 'お客様'} 様</p>
      <p>以下のタスクの期限が${DEADLINE_DAYS}日以内に迫っています。ご確認ください。</p>
      <ul>${taskListHtml}</ul>
      <p><a href="${baseUrl}/dashboard">ダッシュボードへ</a></p>
    `;

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject,
      html,
    });

    if (sendError) {
      console.error('[task-deadline-reminder] email error', to, sendError);
    } else {
      sentCount += 1;
      console.log('[task-deadline-reminder] email sent:', to);
    }
  }

  // LINE Messaging API 발송
  const lineMessagingAccessToken = process.env.LINE_MESSAGING_ACCESS_TOKEN;
  let lineMessagingSentCount = 0;
  
  if (lineMessagingAccessToken && lineMessagingToTasks.size > 0) {
    for (const { fullName, lineId, items } of lineMessagingToTasks.values()) {
      const taskListText = items
        .map((i) => `・${i.caseTitle}：${i.title}（期限: ${i.deadline}）`)
        .join('\n');
      const message = `【補助NET】タスクの期限が近づいています（${items.length}件）

${fullName || 'お客様'}様
以下のタスクの期限が${DEADLINE_DAYS}日以内に迫っています。ご確認ください。

${taskListText}

${baseUrl}/dashboard`;

      try {
        const messagingRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lineMessagingAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: lineId,
            messages: [
              {
                type: 'text',
                text: message,
              },
            ],
          }),
        });

        if (!messagingRes.ok) {
          const errorText = await messagingRes.text();
          console.error('[task-deadline-reminder] LINE error', lineId.substring(0, 10) + '...', messagingRes.status, errorText);
        } else {
          lineMessagingSentCount += 1;
          console.log('[task-deadline-reminder] LINE sent:', lineId);
        }
      } catch (e) {
        console.error('[task-deadline-reminder] LINE request error', e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    recipients: emailToTasks.size,
    lineMessagingSent: lineMessagingSentCount,
    lineMessagingRecipients: lineMessagingToTasks.size,
  });
}
