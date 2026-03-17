/**
 * 専門家（expert）画面で使う共通型定義。
 */

export interface Step {
  id: number;
  stepName: string;
  subtitle: string;
  description: string;
  estimatedDays: number;
}

export interface SubsidySummary {
  id: string;
  title: string;
  amount: string;
  status: string;
  caseCount: number;
  deadline?: string;
}
