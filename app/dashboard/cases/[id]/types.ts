// Types for Case Detail page

export type TabType = 'flow' | 'todo' | 'documents' | 'messages' | 'members' | 'hearing';

export type HearingQuestionType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox';

export interface HearingQuestion {
  id: string;
  question: string;
  type: HearingQuestionType;
  required: boolean;
  options?: string[];
}

export interface HearingFormData {
  templateId: string;
  templateTitle: string;
  questions: HearingQuestion[];
  responses: Record<string, string | string[]>;
  status: 'pending' | 'draft' | 'submitted' | 'reviewed';
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
  /** 전문가가 추가로 보낸 질문 개수. 있을 때만 탭 배지에 숫자 표시 */
  expertAddedQuestionCount?: number;
}

export interface Document {
  id: number;
  title: string;
  status: 'returned' | 'not-submitted' | 'under-review' | 'approved';
  statusText: string;
  required: boolean;
  uploadDate: string | null;
  borderColor: string;
  statusBgColor: string;
  statusTextColor: string;
  hasComment: boolean;
  comment: string | null;
  hasTemplate: boolean;
  templateText: string | null;
}

export interface ChecklistItem {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  deadline: string | null;
  deadlineColor: string | null;
  linkText: string;
  borderColor: string;
  // Extended fields for API integration
  rawStatus?: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  statusLabel?: string;
  rejectionReason?: string | null;
  type?: string;
  linkUrl?: string | null;
  /** 担当: customer=顧客（ユーザーが提出）, expert/assistant=専門家 */
  assignee_role?: 'customer' | 'expert' | 'assistant';
  /** 未読NEW通知フラグ */
  is_new?: boolean;
}

export interface Step {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  estimate: string;
  status: 'completed' | 'in-progress' | 'not-started';
  iconColor: string;
  borderColor: string;
  hasShadow?: boolean;
}

export interface Message {
  id: number;
  sender: string;
  senderType: 'company' | 'expert';
  avatar: string;
  avatarBgColor: string;
  avatarTextColor: string;
  date: string;
  content: string;
  attachments: { name: string; size: string }[];
}

export interface Member {
  id: number;
  name: string;
  role: 'applicant' | 'introducer' | 'member';
  roleText: string;
  roleBgColor: string;
  roleBorderColor: string;
  roleTextColor: string;
  canDelete: boolean;
}

export interface ProjectInfo {
  title: string;
  status: string;
  needsAction: boolean;
  location: string;
  deadline: string;
  assignee: string;
  amount: string;
  progress: number;
  customerName?: string;
  companyName?: string;
}
