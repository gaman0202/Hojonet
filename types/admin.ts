/**
 * 管理者（admin）画面で使う共通型定義。
 */

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

export interface SubsidyCardData {
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
