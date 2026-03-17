export type TemplateType = 'message' | 'document' | 'task' | 'hearing';

export type TemplateCategory = 'all' | 'hearing' | 'document-request' | 'reminder' | 'feedback' | 'general';

export type DocumentCategory = 'all' | 'subsidy-application' | 'business-plan' | 'financial-documents' | 'external-system' | 'reference-materials';

export type TaskCategory = 'all' | 'hearing' | 'document' | 'meeting' | 'confirmation' | 'application' | 'report' | 'preparation';

export type Priority = 'high' | 'medium' | 'low';

export type Role = 'administrative-scrivener' | 'assistant';

export interface Template {
  id: string;
  category: TemplateCategory;
  title: string;
  content: string;
  type: TemplateType;
}

export interface DocumentTemplate {
  id: string;
  category: DocumentCategory;
  title: string;
  description: string;
  updatedDate: string;
  usageCount: number;
  iconType: 'document' | 'link';
  actionType: 'download' | 'link';
  actionUrl?: string;
  fileName?: string;
  type: 'document';
}

export interface TaskTemplate {
  id: string;
  category: TaskCategory;
  title: string;
  description: string;
  priority: Priority;
  role: Role;
  fileName?: string;
  fileUrl?: string;
  type: 'task';
}

export interface CategoryBadge {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// Hearing Template Types
export type HearingQuestionType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox';

export interface HearingQuestion {
  id: string;
  question: string;
  type: HearingQuestionType;
  required: boolean;
  options?: string[];
}

export interface HearingTemplate {
  id: string;
  title: string;
  description: string;
  subsidyType: string;
  questions: HearingQuestion[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HearingResponse {
  id: string;
  caseId: number;
  templateId: number;
  responses: Record<string, string | string[]>;
  status: 'draft' | 'submitted' | 'reviewed';
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
}
