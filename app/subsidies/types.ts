// Types for Subsidies Page

export interface Subsidy {
  id: string;
  statusTags: string[];
  title: string;
  implementingOrganization?: string;
  location: string;
  deadline: string;
  deadlineColor: string;
  amount: string;
  subsidyRate: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
}

export interface TableRow {
  label: string;
  value: string;
  isBadge?: boolean;
  isLink?: boolean;
}

export interface SubsidyDetails {
  status: string;
  title: string;
  implementingOrganization: string;
  region: string;
  amount: string;
  applicationPeriod: string;
  subsidyRate: string;
  purpose: string;
  targetIndustries: string;
  officialPage: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
}

export interface Expert {
  id: string; // profiles.id（選択した専門家をヒアリング申込時に紐づける）
  name: string;
  iconUrl?: string | null;
  rating: number;
  message: string;
  services: string[];
  office: string;
  registrationYear: string;
  registrationNumber: string;
}
