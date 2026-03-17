import {
  DocumentIcon,
  CheckIcon,
  ChatBubbleIcon,
  ClockIcon,
  UploadIcon,
  UserIcon,
  RejectIcon,
} from '@/components/icons';
import type { Task, TaskDisplayStatus, ApiTaskRow } from './types';

export const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high':
      return { bg: '#FFE2E2', border: '#FFC9C9', text: '#C10007', label: '高' };
    case 'medium':
      return { bg: '#FEF9C2', border: '#FFF085', text: '#A65F00', label: '中' };
    case 'low':
      return { bg: '#DBEAFE', border: '#BEDBFF', text: '#1447E6', label: '低' };
  }
};

export const getStepStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#00C950';
    case 'in-progress':
      return '#AD46FF';
    case 'pending':
      return '#99A1AF';
    default:
      return '#99A1AF';
  }
};

export const getStepStatusBg = (status: string) => {
  switch (status) {
    case 'completed':
      return '#00C950';
    case 'in-progress':
      return '#AD46FF';
    case 'pending':
      return '#99A1AF';
    default:
      return '#99A1AF';
  }
};

export const getDocumentStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return { bg: '#DCFCE7', text: '#008236', label: '承認' };
    case 'rejected':
      return { bg: '#FFE2E2', text: '#C10007', label: '却下' };
    case 'reviewing':
      return { bg: '#DBEAFE', text: '#1447E6', label: '検討中' };
    case 'pending':
      return { bg: '#F3F4F6', text: '#364153', label: 'アップロード待ち' };
    default:
      return { bg: '#F3F4F6', text: '#364153', label: '' };
  }
};

export const getActionIcon = (actionType: string) => {
  if (actionType.includes('却下') || actionType.includes('差戻')) {
    return { icon: RejectIcon, color: '#C10007' };
  } else if (
    actionType.includes('承認') ||
    actionType.includes('完了') ||
    actionType.includes('生成') ||
    actionType.includes('作成')
  ) {
    return { icon: CheckIcon, color: '#008236' };
  } else if (actionType.includes('メッセージ') || actionType.includes('送信')) {
    return { icon: ChatBubbleIcon, color: '#007595' };
  } else if (actionType.includes('アップロード')) {
    return { icon: UploadIcon, color: '#8200DB' };
  } else if (actionType.includes('指定')) {
    return { icon: UserIcon, color: '#1447E6' };
  } else if (actionType.includes('変更')) {
    return { icon: ClockIcon, color: '#CA3500' };
  }
  return { icon: DocumentIcon, color: '#8200DB' };
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/** APIのstatusをカンバン表示用の3列ステータスに変換 */
function apiStatusToDisplayStatus(apiStatus: string): TaskDisplayStatus {
  switch (apiStatus) {
    case 'pending':
      return 'pending';
    case 'approved':
      return 'completed';
    case 'in_progress':
    case 'submitted':
    case 'review':
    case 'rejected':
    default:
      return 'in-progress';
  }
}

/** 担当者ロールの表示名 */
const ASSIGNEE_ROLE_LABELS: Record<string, string> = {
  customer: '顧客',
  expert: '行政書士',
  assistant: 'アシスタント',
};

/**
 * 期限文字列(YYYY-MM-DD)からローカル日付で「残り日数」を計算する。
 * サーバーの days_remaining はタイムゾーン等でずれるため、クライアントで再計算する。
 */
function computeDaysLeft(deadlineStr: string | null): number {
  if (!deadlineStr || String(deadlineStr).length < 10) return 0;
  const s = String(deadlineStr).slice(0, 10);
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = s.split('-').map(Number);
  const deadlineDate = new Date(y, m - 1, d);
  const diffMs = deadlineDate.getTime() - todayNorm.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * 期限文字列(YYYY-MM-DD)を MM/DD にフォーマット。タイムゾーンに依存しない。
 */
function formatDueDate(deadlineStr: string | null): string {
  if (!deadlineStr || String(deadlineStr).length < 10) return '';
  const s = String(deadlineStr).slice(0, 10);
  const [_, month, day] = s.split('-');
  return `${month}/${day}`;
}

/** APIタスク1件をUI用Taskに変換 */
export function mapApiTaskToTask(row: ApiTaskRow): Task {
  const assigneeName =
    row.assignee?.full_name?.trim() ||
    ASSIGNEE_ROLE_LABELS[row.assignee_role] ||
    '未割当';
  const deadline = row.deadline ? String(row.deadline).slice(0, 10) : null;
  const dueDate = formatDueDate(deadline);
  const daysLeft = deadline ? computeDaysLeft(deadline) : 0;
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    description: row.description ?? '',
    assignee: assigneeName,
    dueDate,
    daysLeft,
    deadline: deadline ?? undefined,
    status: apiStatusToDisplayStatus(row.status),
    rawStatus: row.status,
    rejectionReason: row.rejection_reason,
    type: row.type,
    is_new: row.is_new ?? false,
  };
}
