// app/dashboard/cases/data.ts

import { Filter, Case } from './types';

export const filters: Filter[] = [
  { key: 'all', label: 'すべて', count: 24 },
  { key: 'hearing', label: 'ヒアリング中', count: 4 },
  { key: 'doc_prep', label: '書類製作中', count: 0 },
  { key: 'submitted', label: '申請完了', count: 3 },
  { key: 'reviewing', label: '審査中', count: 4 },
  { key: 'approved', label: '交付決定', count: 3 },
];

export const cases: Case[] = [
  {
    id: 1,
    tags: ['document-prep', '対応必要'],
    status: '申請案件',
    title: '小規模事業者持続化補助金',
    deadline: '2025-01-15 (30日後)',
    progress: 60,
    assignee: '佐藤美咲 行政書士',
    amount: '最大500万円',
    messages: 3,
    documents: 2,
  },
  {
    id: 2,
    tags: ['申請完了', '審査中'],
    status: '申請案件',
    title: '事業再構築補助金',
    deadline: '2025-01-20 (35日後)',
    progress: 85,
    assignee: '佐藤美咲 行政書士',
    amount: '最大8,000万円',
  },
  {
    id: 3,
    tags: ['申請完了', '審査中'],
    status: '申請案件',
    title: '事業再構築補助金',
    deadline: '2025-01-20 (35日後)',
    progress: 85,
    assignee: '佐藤美咲 行政書士',
    amount: '最大8,000万円',
  },
  {
    id: 4,
    tags: ['ヒアリング中'],
    title: 'ものづくり補助金',
    deadline: '2025-02-01 (47日後)',
    progress: 20,
    assignee: '山田健太 行政書士',
    amount: '最大1,000万円',
    documents: 1,
  },
  {
    id: 5,
    tags: ['ヒアリング中'],
    title: 'ものづくり補助金',
    deadline: '2025-02-01 (47日後)',
    progress: 20,
    assignee: '山田健太 行政書士',
    amount: '最大1,000万円',
    documents: 1,
  },
];
