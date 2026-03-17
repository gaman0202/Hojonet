/**
 * 案件（case）関連の共通型定義。
 * expert/management/[id]/[caseId] や dashboard/cases などで参照する。
 */

export interface ProgressStep {
  id: number;
  title: string;
  subtitle: string;
  status: 'completed' | 'in-progress' | 'pending';
  statusText: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  company: string;
  contact: string;
  industry: string;
  region: string;
}

export interface CaseInfo {
  applicationDate: string;
  deadline: string;
  status: string;
  assignee: string;
  assistant: string;
}

export interface Message {
  id: number;
  sender: string;
  senderInitial: string;
  content: string;
  time: string;
  isExpert: boolean;
}

/** タスク表示用ステータス（3列カンバン） */
export type TaskDisplayStatus = 'pending' | 'in-progress' | 'completed';

export interface Task {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  assignee: string;
  dueDate: string;
  daysLeft: number;
  deadline?: string;
  status: TaskDisplayStatus;
  rawStatus?: string;
  rejectionReason?: string | null;
  type?: string;
  is_new?: boolean;
}

export interface Document {
  id: number;
  title: string;
  status: 'approved' | 'rejected' | 'reviewing' | 'pending';
  statusText: string;
  date: string;
  feedback?: string;
}

export interface TimelineItem {
  id: number;
  date: string;
  time: string;
  dateTime: string;
  author: string;
  authorInitial: string;
  role: string;
  roleColor: { bg: string; text: string };
  actionType: string;
  actionTypeColor: { bg: string; border: string; text: string };
  description: string;
  targetType?: string;
  targetValue?: string;
  avatarBg: string;
}
