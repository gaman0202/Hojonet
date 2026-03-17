// Types for Customer Detail Page

export interface CaseSummary {
  total: number;
  inProgress: number;
  completed: number;
  underReview: number;
}

export interface Case {
  id: number;
  subsidyId?: number | null;
  tag: string;
  title: string;
  deadline: string;
  progress: number;
  amount: string;
  updatedAt?: string | null;
  introducer?: {
    name: string;
    email: string;
  };
}

export interface TeamMember {
  id: number;
  name: string;
  nameInitial: string;
  email: string;
  role: 'introducer' | 'member';
  avatarBg: string;
  avatarColor: string;
}

export interface ActivityHistory {
  id: number;
  description: string;
  date: string;
  icon: 'document' | 'check' | 'plus' | 'user';
}
