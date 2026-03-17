// Grant/Subsidy Types
export interface GrantDetails {
  id?: string;
  status: string;
  title: string;
  applicationStatus: string;
  implementingOrganization: string;
  region: string;
  grantAmount: string;
  applicationPeriod: string;
  subsidyRate: string;
  purpose: string;
  targetIndustry: string;
  officialPage: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
}

export interface Expert {
  id: string;
  name: string;
  email: string;
  avatarChar: string;
}

export interface TableRow {
  label: string;
  value: string;
  isBadge?: boolean;
  isLink?: boolean;
}

// Subsidy Card Types (for listing page)
export interface Subsidy {
  id: string;
  status: 'open' | 'closed';
  statusLabel: string;
  caseCount: number;
  title: string;
  amount: string;
  expertCount: number;
  location: string;
  industry: string;
  deadline: string;
  overview: string;
  eligibleActivities: string[];
  caseNumber: number;
}

// Grant Registration Types
export interface Step {
  id: number;
  stepName: string;
  subtitle: string;
  description: string;
  estimatedDays: number;
}

export interface GrantFormData {
  subsidyName: string;
  implementingAgency: string;
  region: string;
  amount: string;
  deadline: string;
  targetIndustry: string;
  subsidyRate: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
  hearingQuestions: string[];
  tasks: string[];
  steps: Step[];
}
