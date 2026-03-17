// Types for Home Page

export interface Subsidy {
  id?: number;
  tag: string;
  title: string;
  implementingOrganization?: string;
  location: string;
  deadline: string;
  amount: string;
  description: string;
}

export interface ExpertFeature {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}
