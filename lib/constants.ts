/**
 * アプリ全体で使う色・ステータスなどの定数
 */

export const COLORS = {
  primary: '#9810FA',
  primaryDark: '#8200DB',
  black: '#101828',
  gray: '#4A5565',
  lightGray: '#6A7282',
  border: '#E5E7EB',
  background: '#F9FAFB',
  white: '#FFFFFF',
  success: '#00C950',
  successDark: '#008236',
  error: '#FB2C36',
  errorDark: '#C10007',
  warning: '#A65F00',
  info: '#1447E6',
} as const;

/** ステップ・タスクの進行状態 */
export const STEP_STATUS = {
  pending: { bg: '#99A1AF', text: '#FFFFFF', label: '進行前' },
  'in-progress': { bg: '#AD46FF', text: '#FFFFFF', label: '進行中' },
  completed: { bg: '#00C950', text: '#FFFFFF', label: '完了' },
} as const;

/** 優先度バッジ */
export const PRIORITY_BADGE = {
  high: { bg: '#FFE2E2', border: '#FFC9C9', text: '#C10007', label: '高' },
  medium: { bg: '#FEF9C2', border: '#FFF085', text: '#A65F00', label: '中' },
  low: { bg: '#DBEAFE', border: '#BEDBFF', text: '#1447E6', label: '低' },
} as const;

/** 書類ステータスバッジ */
export const DOCUMENT_STATUS_BADGE = {
  approved: { bg: '#DCFCE7', text: '#008236', label: '承認' },
  rejected: { bg: '#FFE2E2', text: '#C10007', label: '却下' },
  reviewing: { bg: '#DBEAFE', text: '#1447E6', label: '検討中' },
  pending: { bg: '#F3F4F6', text: '#364153', label: 'アップロード待ち' },
} as const;
