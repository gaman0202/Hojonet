// Types for Cases Page

export type FilterType = 'all' | 'consultation' | 'hearing' | 'doc_prep' | 'doc_review' | 'submitted' | 'reviewing' | 'approved';

export interface Filter {
  key: FilterType;
  label: string;
  count: number;
}

export interface Case {
  id: number;
  tags: string[];
  status?: string;
  title: string;
  deadline: string;
  progress: number;
  assignee: string;
  amount: string;
  documents?: number;
  messages?: number;
}

// New interface for DB-connected case items
export interface CaseItem {
  id: string;
  status: string;
  statusText: string;
  needsAction: boolean;
  title: string;
  amount: string;
  deadline: string;
  daysLeft: number | null;
  progress: number;
  assignee: string;
  messageCount: number;
  taskCount: number;
}
