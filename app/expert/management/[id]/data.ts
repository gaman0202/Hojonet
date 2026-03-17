import type { KanbanColumn } from '@/lib/expert/cases';

/** cases.status と 칸반 컬럼 매핑 (DB 값 → 표시 라벨) */
export const KANBAN_STATUS_CONFIG: { id: string; title: string }[] = [
  { id: 'consultation', title: '相談受付' },
  { id: 'hearing', title: 'ヒアリング' },
  { id: 'doc_prep', title: '書類準備' },
  { id: 'review', title: '審査中' },
  { id: 'submitted', title: '申請完了' },
  { id: 'accepted', title: '採択' },
  { id: 'rejected', title: '却下' },
];

export const kanbanColumns: KanbanColumn[] = [
  {
    id: 'consultation',
    title: '相談受付',
    count: 1,
    cards: [
      {
        id: 1,
        userName: '田中太郎',
        userInitial: '田',
        amount: '40万円',
        deadline: '2025-01-15',
        progress: 10,
        urgentLevel: 1,
        chatCount: 2,
      },
    ],
  },
  {
    id: 'hearing',
    title: 'ヒアリング',
    count: 2,
    cards: [
      {
        id: 2,
        userName: '鈴木花子',
        userInitial: '鈴',
        amount: '40万円',
        deadline: '2025-01-18',
        progress: 25,
        chatCount: 1,
        hasButtons: true,
      },
      {
        id: 3,
        userName: '佐々木一郎',
        userInitial: '佐',
        amount: '40万円',
        deadline: '2025-01-20',
        progress: 30,
        progressColor: '#F0B100',
        needsAction: true,
        hasButtons: true,
      },
    ],
  },
  {
    id: 'document-prep',
    title: '書類準備',
    count: 1,
    cards: [
      {
        id: 4,
        userName: '高橋美咲',
        userInitial: '高',
        amount: '40万円',
        deadline: '2025-01-15',
        progress: 60,
        progressColor: '#2B7FFF',
        urgentLevel: 2,
        chatCount: 3,
        needsAction: true,
      },
    ],
  },
  {
    id: 'document-review',
    title: '書類確認',
    count: 2,
    cards: [
      {
        id: 5,
        userName: '伊藤健一',
        userInitial: '伊',
        amount: '40万円',
        deadline: '2025-01-12',
        progress: 75,
        progressColor: '#2B7FFF',
        urgentLevel: 1,
      },
      {
        id: 6,
        userName: '渡辺直美',
        userInitial: '渡',
        amount: '40万円',
        deadline: '2025-01-14',
        progress: 70,
        progressColor: '#2B7FFF',
        chatCount: 2,
      },
    ],
  },
  {
    id: 'submitted',
    title: '提出完了',
    count: 1,
    cards: [
      {
        id: 7,
        userName: '中村悠太',
        userInitial: '中',
        amount: '最大450万円',
        deadline: '2025-01-10',
        progress: 90,
        progressColor: '#00C950',
      },
    ],
  },
  {
    id: 'waiting',
    title: '結果待ち',
    count: 2,
    cards: [
      {
        id: 8,
        userName: '小林恵子',
        userInitial: '小',
        amount: '最大600万円',
        deadline: '2025-01-20',
        progress: 85,
        progressColor: '#00C950',
      },
      {
        id: 9,
        userName: '加藤雄一',
        userInitial: '加',
        amount: '最大550万円',
        deadline: '2025-01-22',
        progress: 88,
        progressColor: '#00C950',
      },
    ],
  },
  {
    id: 'selected',
    title: '採択',
    count: 1,
    cards: [
      {
        id: 10,
        userName: '吉田真理子',
        userInitial: '吉',
        amount: '最大500万円',
        deadline: '2025-01-25',
        progress: 95,
        progressColor: '#00C950',
        urgentLevel: 1,
        chatCount: 2,
        needsAction: true,
      },
    ],
  },
];

export const subsidyInfo = {
  title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集',
  caseCount: 10,
};
