// Types for Dashboard Page

export interface Announcement {
  icon: 'case' | 'clock' | 'message';
  text: string;
}

export interface OverviewCard {
  title: string;
  value: string;
  description: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

export interface CaseCard {
  id: number;
  tags: string[];
  status?: string;
  title: string;
  deadline: string;
  progress: number;
  progressColor?: string;
  amount: string;
  assignee: string;
  documents?: number;
  messages?: number;
}

export interface Task {
  id: number;
  title: string;
  caseTitle: string;
  caseId: number;
  daysRemaining: number;
}
