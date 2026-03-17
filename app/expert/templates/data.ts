import { CategoryBadge } from './types';

export const categoryBadges: Record<string, CategoryBadge> = {
  hearing: {
    label: 'ヒアリング依頼',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#1447E6',
  },
  'document-request': {
    label: '書類提出依頼',
    bgColor: '#F3E8FF',
    borderColor: '#E9D4FF',
    textColor: '#8200DB',
  },
  reminder: {
    label: 'リマインド',
    bgColor: '#FFEDD4',
    borderColor: '#FFD6A7',
    textColor: '#CA3500',
  },
  feedback: {
    label: 'フィードバック',
    bgColor: '#FFE2E2',
    borderColor: '#FFC9C9',
    textColor: '#C10007',
  },
  general: {
    label: '一般',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    textColor: '#364153',
  },
};

export const filterCategories: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'hearing', label: 'ヒアリング依頼' },
  { value: 'document-request', label: '書類提出依頼' },
  { value: 'reminder', label: 'リマインド' },
  { value: 'feedback', label: 'フィードバック' },
  { value: 'general', label: '一般' },
];

export const documentCategoryBadges: Record<string, CategoryBadge> = {
  'subsidy-application': {
    label: '補助金申請',
    bgColor: '#F3E8FF',
    borderColor: '#E9D4FF',
    textColor: '#8200DB',
  },
  'business-plan': {
    label: '事業計画',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#1447E6',
  },
  'financial-documents': {
    label: '財務書類',
    bgColor: '#DCFCE7',
    borderColor: '#B9F8CF',
    textColor: '#008236',
  },
  'external-system': {
    label: '外部システム',
    bgColor: '#FFEDD4',
    borderColor: '#FFD6A7',
    textColor: '#CA3500',
  },
  'reference-materials': {
    label: '参考資料',
    bgColor: '#CEFAFE',
    borderColor: '#A2F4FD',
    textColor: '#007595',
  },
};

export const documentFilterCategories: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'subsidy-application', label: '補助金申請' },
  { value: 'business-plan', label: '事業計画' },
  { value: 'financial-documents', label: '財務書類' },
  { value: 'external-system', label: '外部システム' },
  { value: 'reference-materials', label: '参考資料' },
];

export const taskCategoryBadges: Record<string, CategoryBadge> = {
  hearing: {
    label: 'ヒアリング',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#1447E6',
  },
  document: {
    label: '書類',
    bgColor: '#F3E8FF',
    borderColor: '#E9D4FF',
    textColor: '#8200DB',
  },
  meeting: {
    label: '打合せ',
    bgColor: '#DCFCE7',
    borderColor: '#B9F8CF',
    textColor: '#008236',
  },
  confirmation: {
    label: '確認',
    bgColor: '#FFEDD4',
    borderColor: '#FFD6A7',
    textColor: '#CA3500',
  },
  application: {
    label: '申請',
    bgColor: '#FFE2E2',
    borderColor: '#FFC9C9',
    textColor: '#C10007',
  },
  report: {
    label: '報告',
    bgColor: '#CEFAFE',
    borderColor: '#A2F4FD',
    textColor: '#007595',
  },
  preparation: {
    label: '準備',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    textColor: '#364153',
  },
};

export const priorityBadges: Record<string, CategoryBadge> = {
  high: {
    label: '高',
    bgColor: '#FFE2E2',
    borderColor: '#FFC9C9',
    textColor: '#C10007',
  },
  medium: {
    label: '中',
    bgColor: '#FEF9C2',
    borderColor: '#FFF085',
    textColor: '#A65F00',
  },
  low: {
    label: '低',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#1447E6',
  },
};

export const roleLabels: Record<string, string> = {
  'administrative-scrivener': '行政書士',
  assistant: 'アシスタント',
};

export const taskFilterCategories: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'hearing', label: 'ヒアリング' },
  { value: 'document', label: '書類' },
  { value: 'meeting', label: '打合せ' },
  { value: 'confirmation', label: '確認' },
  { value: 'application', label: '申請' },
  { value: 'report', label: '報告' },
  { value: 'preparation', label: '準備' },
];
