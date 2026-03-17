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

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  expert: { bg: '#F3E8FF', text: '#8200DB' },
  assistant: { bg: '#DBEAFE', text: '#1447E6' },
  customer: { bg: '#DCFCE7', text: '#008236' },
  member: { bg: '#F3F4F6', text: '#364153' },
  admin: { bg: '#F3E8FF', text: '#8200DB' },
  system: { bg: '#F3F4F6', text: '#364153' },
};

const ROLE_LABEL: Record<string, string> = {
  expert: '行政書士',
  assistant: 'アシスタント',
  customer: '顧客',
  member: 'メンバー',
  admin: '管理者',
  system: 'システム',
};

const ACTION_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  task_approved: { bg: '#DCFCE7', border: '#B9F8CF', text: '#008236' },
  task_rejected: { bg: '#FFE2E2', border: '#FFC9C9', text: '#C10007' },
  task_submitted: { bg: '#CEFAFE', border: '#A2F4FD', text: '#007595' },
  task_completed: { bg: '#DCFCE7', border: '#B9F8CF', text: '#008236' },
  task_uncompleted: { bg: '#FEF9C2', border: '#FFF085', text: '#A65F00' },
  task_created: { bg: '#F3E8FF', border: '#E9D4FF', text: '#8200DB' },
  task_updated: { bg: '#DBEAFE', border: '#BEDBFF', text: '#1447E6' },
  task_deleted: { bg: '#FFE2E2', border: '#FFC9C9', text: '#C10007' },
  document_uploaded: { bg: '#F3E8FF', border: '#E9D4FF', text: '#8200DB' },
  document_approved: { bg: '#DCFCE7', border: '#B9F8CF', text: '#008236' },
  document_rejected: { bg: '#FFE2E2', border: '#FFC9C9', text: '#C10007' },
  message_sent: { bg: '#CEFAFE', border: '#A2F4FD', text: '#007595' },
  step_changed: { bg: '#FFEDD4', border: '#FFD6A7', text: '#CA3500' },
  hearing_submitted: { bg: '#DCFCE7', border: '#B9F8CF', text: '#008236' },
};

const ACTION_LABEL: Record<string, string> = {
  task_approved: 'タスク承認',
  task_rejected: 'タスク却下',
  task_submitted: 'タスク提出',
  task_completed: 'タスク完了',
  task_uncompleted: 'タスク完了取消',
  task_created: 'タスク作成',
  task_updated: 'タスク更新',
  task_deleted: 'タスク削除',
  document_uploaded: '書類アップロード',
  document_approved: '書類承認',
  document_rejected: '書類却下',
  message_sent: 'メッセージ送信',
  step_changed: 'ステップ変更',
  hearing_submitted: 'ヒアリング回答',
};

const AVATAR_BG_BY_ROLE: Record<string, string> = {
  expert: '#9810FA',
  assistant: '#155DFC',
  customer: '#00A63E',
  member: '#6A7282',
  admin: '#9810FA',
  system: '#4A5565',
};

function formatDate(createdAt: string): { date: string; time: string; dateTime: string } {
  const d = new Date(createdAt);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const date = `${month}月${day}日`;
  const isPM = hours >= 12;
  const h = hours % 12 || 12;
  const time = `${isPM ? '午後' : '午前'} ${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { date, time, dateTime: createdAt };
}

function targetTypeToJa(targetType: string | null): string | undefined {
  if (!targetType) return undefined;
  const m: Record<string, string> = { document: '書類', task: 'タスク', case: '案件' };
  return m[targetType] ?? targetType;
}

/**
 * GET: 案件のアクティビティ（タイムライン）一覧
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
      .from('activity_logs')
      .select('id, case_id, actor_id, action_type, description, target_type, target_id, target_value, created_at')
      .eq('case_id', caseIdNum)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Activity fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = actorIds.length
      ? await supabaseAdmin
          .from('profiles')
          .select('id, full_name, company_name, user_type')
          .in('id', actorIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const activities = (rows ?? []).map((row) => {
      const profile = row.actor_id ? profileMap.get(row.actor_id) : null;
      const userType = profile?.user_type ?? 'system';
      const roleStyle = ROLE_STYLE[userType] ?? ROLE_STYLE.system;
      const roleLabel = ROLE_LABEL[userType] ?? 'システム';
      const authorName = profile
        ? (profile.full_name || profile.company_name || '不明').trim()
        : 'システム';
      const authorInitial = authorName.charAt(0) || 'シ';
      const actionStyle = ACTION_STYLE[row.action_type] ?? { bg: '#F3F4F6', border: '#E5E7EB', text: '#364153' };
      const actionLabel = ACTION_LABEL[row.action_type] ?? row.action_type;
      const { date, time, dateTime } = formatDate(row.created_at);

      return {
        id: Number(row.id),
        date,
        time,
        dateTime,
        author: authorName,
        authorInitial,
        role: roleLabel,
        roleColor: roleStyle,
        actionType: actionLabel,
        actionTypeColor: actionStyle,
        description: row.description ?? '',
        targetType: targetTypeToJa(row.target_type) ?? undefined,
        targetValue: row.target_value ?? undefined,
        avatarBg: AVATAR_BG_BY_ROLE[userType] ?? '#4A5565',
      };
    });

    return NextResponse.json({ activities });
  } catch (e) {
    console.error('Activity GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
