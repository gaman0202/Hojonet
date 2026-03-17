import { CaseSummary, Case, TeamMember, ActivityHistory } from './types';

export const caseSummary: CaseSummary = {
  total: 1,
  inProgress: 1,
  completed: 0,
  underReview: 0,
};

export const cases: Case[] = [
  {
    id: 1,
    tag: 'consultation',
    title: '小規模事業者持続化補助金',
    deadline: '2025-01-15',
    progress: 10,
    amount: '最大500万円',
    introducer: {
      name: '山田三郎',
      email: 'sato@office-example.jp',
    },
  },
];

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: '山田三郎',
    nameInitial: '山',
    email: 'sato@office-example.jp',
    role: 'introducer',
    avatarBg: '#F3E8FF',
    avatarColor: '#9810FA',
  },
  {
    id: 2,
    name: '佐藤歩',
    nameInitial: '佐',
    email: 'tanaka@office-example.jp',
    role: 'member',
    avatarBg: '#DBEAFE',
    avatarColor: '#155DFC',
  },
];

export const activityHistory: ActivityHistory[] = [
  {
    id: 1,
    description: '事業再構築補助金の申請を提出',
    date: '2024年12月15日',
    icon: 'document',
  },
  {
    id: 2,
    description: 'ヒアリングシートを完了',
    date: '2024年12月10日',
    icon: 'check',
  },
  {
    id: 3,
    description: '新規案件を作成',
    date: '2024年12月5日',
    icon: 'plus',
  },
  {
    id: 4,
    description: '初回面談を実施',
    date: '2024年12月1日',
    icon: 'user',
  },
];
