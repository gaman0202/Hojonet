import { Expertise, TeamMember, LoginHistory, ProfileFormData, NotificationSettings } from './types';

// Default profile data
export const DEFAULT_PROFILE: ProfileFormData = {
  name: '佐藤美咲',
  furigana: 'さとう みさき',
  email: 'sato@office-example.jp',
  phone: '03-1234-5678',
  message: '',
  officeName: '佐藤行政書士事務所',
  officeLocation: '東京都千代田区丸の内1-1-1',
  registrationNumber: '第12345678号',
  affiliation: '東京都行政書士会',
  registrationYear: '2015年',
  region: '東京都',
  memo: '',
};

// Default expertise list
export const DEFAULT_EXPERTISE: Expertise[] = [
  { id: '1', name: '事業再構築補助金' },
  { id: '2', name: 'ものづくり補助金' },
  { id: '3', name: '小規模事業者持続化補助金' },
  { id: '4', name: 'IT導入補助金' },
];

// Default notification settings
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  deadlineReminder: true,
  newCaseNotification: true,
  documentUploadNotification: true,
  messageNotification: true,
  systemMaintenance: true,
  newFeatureRelease: true,
};

// Default team members
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: '佐藤美咲',
    email: 'sato@office-example.jp',
    role: 'administrative-scrivener',
    avatarColor: '#9810FA',
    avatarBgColor: '#F3E8FF',
    roleColor: '#8200DB',
    roleBgColor: '#F3E8FF',
  },
  {
    id: '2',
    name: '田中太郎',
    email: 'tanaka@office-example.jp',
    role: 'assistant',
    avatarColor: '#155DFC',
    avatarBgColor: '#DBEAFE',
    roleColor: '#1447E6',
    roleBgColor: '#DBEAFE',
  },
];

// Sample login history
export const SAMPLE_LOGIN_HISTORY: LoginHistory[] = [
  {
    id: '1',
    date: '2024年12月15日',
    time: '14:23',
    location: '東京都',
    device: 'Chrome on Windows',
    isCurrentSession: true,
  },
  {
    id: '2',
    date: '2024年12月15日',
    time: '09:15',
    location: '東京都',
    device: 'Safari on iPhone',
  },
  {
    id: '3',
    date: '2024年12月14日',
    time: '18:42',
    location: '東京都',
    device: 'Chrome on Windows',
  },
];

// Role display names
export const ROLE_LABELS: Record<TeamMember['role'], string> = {
  'administrative-scrivener': '専門家',
  'assistant': 'アシスタント',
};

// Helper to create new team member
export function createTeamMember(
  email: string,
  role: TeamMember['role'],
  existingCount: number
): TeamMember {
  const isExpert = role === 'administrative-scrivener';
  return {
    id: String(existingCount + 1),
    name: email.split('@')[0] || 'New Member',
    email: email.trim(),
    role,
    avatarColor: isExpert ? '#9810FA' : '#155DFC',
    avatarBgColor: isExpert ? '#F3E8FF' : '#DBEAFE',
    roleColor: isExpert ? '#8200DB' : '#1447E6',
    roleBgColor: isExpert ? '#F3E8FF' : '#DBEAFE',
  };
}
