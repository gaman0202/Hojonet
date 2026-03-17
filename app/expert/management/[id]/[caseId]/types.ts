// Types for CaseDetail page — 共通型は @/types/case から re-export、ページ固有はここで定義

export type {
  ProgressStep,
  CustomerInfo,
  CaseInfo,
  Message,
  TaskDisplayStatus,
  Task,
  Document,
  TimelineItem,
} from '@/types/case';

export interface Schedule {
  id: number;
  date: string;
  title: string;
  statusText: string;
  statusColor: string;
}

/** APIのタスク取得レスポンス1件 */
export interface ApiTaskRow {
  id: number;
  case_id: number;
  title: string;
  description: string | null;
  type: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
  days_remaining: number | null;
  assignee_role: string;
  assignee_id: string | null;
  status: string;
  is_required: boolean;
  link_url: string | null;
  remind_at: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_new?: boolean;
  assignee?: { id: string; full_name: string | null; icon_url: string | null } | null;
  reviewer?: { id: string; full_name: string | null; icon_url: string | null } | null;
}

export interface TaskTemplate {
  id: string | number;
  title: string;
  description: string;
  priority: string;
  priorityColor: { bg: string; text: string };
  assignee: string;
  category: string;
  fileName?: string;
  fileUrl?: string;
}

export interface FormQuestion {
  id: string;
  question: string;
}

export type TabId = 'info' | 'tasks' | 'documents' | 'timeline';

export interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}
