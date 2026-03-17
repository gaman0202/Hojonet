// Types for Expert Management Page
import { ComponentType } from 'react';

export interface SummaryCard {
  id: number;
  title: string;
  value: string;
  icon: ComponentType<{ size: number; color: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

export interface Subsidy {
  id: number;
  status: string;
  statusColor: string;
  statusBg: string;
  statusBorder: string;
  caseCount: string;
  caseCountColor: string;
  caseCountBg: string;
  caseCountBorder: string;
  title: string;
  amount: string;
  subsidyRate: string;
  region: string;
  industry: string;
  deadline: string;
  deadlineUrgent: boolean;
  description: string;
  tags: string[];
  caseNumber: string;
}
