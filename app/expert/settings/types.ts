export type SettingsTab = 'profile' | 'notifications' | 'team' | 'security';

export interface Expertise {
  id: string;
  name: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'administrative-scrivener' | 'assistant';
  avatarColor: string;
  avatarBgColor: string;
  roleColor: string;
  roleBgColor: string;
}

export interface LoginHistory {
  id: string;
  date: string;
  time: string;
  location: string;
  device: string;
  isCurrentSession?: boolean;
}

export interface ProfileFormData {
  name: string;
  furigana: string;
  email: string;
  phone: string;
  message: string;
  officeName: string;
  officeLocation: string;
  registrationNumber: string;
  affiliation: string;
  registrationYear: string;
  region: string;
  memo: string;
}

export interface NotificationSettings {
  deadlineReminder: boolean;
  newCaseNotification: boolean;
  documentUploadNotification: boolean;
  messageNotification: boolean;
  systemMaintenance: boolean;
  newFeatureRelease: boolean;
}
