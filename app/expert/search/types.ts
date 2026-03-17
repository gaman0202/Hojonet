// Types for Expert Search Page

export interface Subsidy {
  id: number;
  status: string[];
  title: string;
  institution?: string;
  region: string;
  deadline: string;
  deadlineUrgent?: boolean;
  maxAmount: string;
  subsidyRate: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
}
