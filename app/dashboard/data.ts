import { Announcement, OverviewCard, CaseCard, Task } from './types';

export const announcements: Announcement[] = [
  { icon: 'case', text: '2件の案件で対応が必要です' },
  { icon: 'clock', text: '期限が迫っているタスクが3件あります' },
  { icon: 'message', text: '未読メッセージが6件あります' },
];

export const overviewCards: OverviewCard[] = [
  {
    title: '進行中の案件',
    value: '4',
    description: '現在申請中の補助金',
    iconBg: '#EFF6FF',
    iconColor: '#155DFC',
    valueColor: '#155DFC',
  },
  {
    title: '緊急タスク',
    value: '3',
    description: '期限が迫っています',
    iconBg: '#FEF2F2',
    iconColor: '#E7000B',
    valueColor: '#E7000B',
  },
];

export const ongoingCases: CaseCard[] = [
  {
    id: 1,
    tags: ['document-prep', '対応必要'],
    status: '申請案件',
    title: '小規模事業者持続化補助金',
    deadline: '2025-01-15 (30日後)',
    progress: 60,
    amount: '最大500万円',
    assignee: '佐藤美咲 行政書士',
    documents: 3,
    messages: 2,
  },
  {
    id: 2,
    tags: ['申請完了', '審査中'],
    status: '申請案件',
    title: '事業再構築補助金',
    deadline: '2025-01-20 (35日後)',
    progress: 85,
    amount: '最大8,000万円',
    assignee: '佐藤美咲 行政書士',
  },
  {
    id: 3,
    tags: ['ヒアリング中'],
    title: 'ものづくり補助金',
    deadline: '2025-02-01 (47日後)',
    progress: 20,
    progressColor: '#CA8A04',
    amount: '最大1,000万円',
    assignee: '山田健太 行政書士',
    documents: 1,
  },
];

export const urgentTasks: Task[] = [
  {
    id: 1,
    title: '事業計画書の期限が迫っています',
    caseTitle: '小規模事業者持続化補助金',
    caseId: 1,
    daysRemaining: 2,
  },
  {
    id: 2,
    title: '見積書3社分の提出依頼',
    caseTitle: '小規模事業者持続化補助金',
    caseId: 1,
    daysRemaining: 4,
  },
  {
    id: 3,
    title: 'IT導入効果の測定',
    caseTitle: 'IT導入補助金',
    caseId: 2,
    daysRemaining: 6,
  },
];
