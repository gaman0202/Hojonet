import { Document, ChecklistItem, Step, Message, Member, ProjectInfo } from './types';
import { createClient } from '@/utils/supabase/client';

// Fetch case details from database
export async function fetchCaseDetails(caseId: string): Promise<ProjectInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      subsidies(title, amount_description, m_regions(name)),
      assignee:profiles!cases_assignee_id_fkey(full_name)
    `)
    .eq('id', caseId)
    .single();

  if (error || !data) {
    console.error('Error fetching case:', error?.message ?? 'Unknown error', error?.code, error?.details ?? error);
    return null;
  }

  // user_group_id は profiles.group_id に対応するため、FK でなく別クエリで申請者プロフィール取得
  let customerName = '';
  let companyName = '';
  if (data.user_group_id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('group_id', data.user_group_id)
      .limit(1)
      .maybeSingle();
    if (userProfile) {
      customerName = userProfile.full_name ?? '';
      companyName = userProfile.company_name ?? '';
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    consultation: '相談受付',
    hearing: 'ヒアリング中',
    doc_prep: '書類準備中',
    doc_review: '書類確認中',
    submitted: '申請完了',
    reviewing: '審査中',
    approved: '交付決定',
  };

  return {
    title: data.title || data.subsidies?.title || '案件',
    status: STATUS_LABELS[data.status] || data.status,
    needsAction: data.needs_attention || false,
    location: data.subsidies?.m_regions?.name || '全国',
    deadline: data.deadline || '',
    assignee: data.assignee?.full_name || '担当者未定',
    amount: data.amount || data.subsidies?.amount_description || '',
    progress: data.progress_rate || 0,
    customerName,
    companyName,
  };
}

// Status labels for display（タスクのステータスを日本語で表示）
const STATUS_LABELS: Record<string, string> = {
  pending: '未着手',
  in_progress: '進行中',
  submitted: '確認待ち',
  review: '確認中',
  approved: '承認済み',
  rejected: '差戻し',
};

// Fetch tasks for a case using API
export async function fetchCaseTasks(caseId: string): Promise<ChecklistItem[]> {
  try {
    const res = await fetch(`/api/expert/cases/${caseId}/tasks`);
    if (!res.ok) {
      console.error('Error fetching tasks:', res.status);
      return []; // Return empty array on error instead of sample data
    }
    const json = await res.json();
    const rawTasks = Array.isArray(json) ? json : (json?.tasks ?? []);

    return rawTasks.map((task: {
      id: number;
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      deadline?: string;
      rejection_reason?: string | null;
      type?: string;
      link_url?: string | null;
      assignee_role?: string;
      is_new?: boolean;
    }) => {
      const daysLeft = task.deadline ? calculateDaysLeft(task.deadline) : null;
      const isUrgent = daysLeft !== null && daysLeft <= 3;
      const isCompleted = task.status === 'approved';
      const isRejected = task.status === 'rejected';
      const isSubmitted = task.status === 'submitted';

      let borderColor = '#E5E7EB';
      if (isCompleted) borderColor = '#B9F8CF';
      else if (isRejected) borderColor = '#FFC9C9';
      else if (isSubmitted) borderColor = '#BEDBFF';
      else if (isUrgent) borderColor = '#FFD6A7';

      let deadlineColor = '#4A5565';
      if (isUrgent) deadlineColor = '#DC2626';
      else if (isCompleted) deadlineColor = '#00C950';

      return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: isCompleted,
        required: task.priority === 'high',
        deadline: daysLeft !== null ? `残り${daysLeft}日` : null,
        deadlineColor,
        linkText: task.link_url ? 'リンクを開く' : '関連書類を確認',
        borderColor,
        rawStatus: task.status as ChecklistItem['rawStatus'],
        statusLabel: STATUS_LABELS[task.status || 'pending'] || task.status,
        rejectionReason: task.rejection_reason,
        type: task.type,
        linkUrl: task.link_url,
        assignee_role: task.assignee_role as ChecklistItem['assignee_role'],
        is_new: task.is_new ?? false,
      };
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return []; // Return empty array on error instead of sample data
  }
}

function calculateDaysLeft(dateStr: string): number {
  const deadline = new Date(dateStr);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Toggle task completion status using API
export async function toggleTaskStatus(taskId: number, completed: boolean): Promise<boolean> {
  try {
    if (completed) {
      // Complete the task
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      return res.ok;
    } else {
      // Uncomplete the task (reset to pending)
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'DELETE',
      });
      return res.ok;
    }
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}

// Submit task for review using API
export async function submitTask(taskId: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/submit`, {
      method: 'POST',
    });
    return res.ok;
  } catch (error) {
    console.error('Error submitting task:', error);
    return false;
  }
}

// Create a new task
export async function createTask(caseId: string, task: {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .insert({
      case_id: parseInt(caseId),
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'pending',
      deadline: task.deadline || null,
    });

  if (error) {
    console.error('Error creating task:', error);
    return false;
  }
  return true;
}

// Delete a task
export async function deleteTask(taskId: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
}

export const documents: Document[] = [
  {
    id: 1,
    title: '事業計画書',
    status: 'returned',
    statusText: '差戻し',
    required: true,
    uploadDate: '2024-12-08',
    borderColor: '#FFC9C9',
    statusBgColor: '#FFE2E2',
    statusTextColor: '#C10007',
    hasComment: true,
    comment: '3ページの収支予算部分の補完が必要です。具体的な数値根拠を追加してください。',
    hasTemplate: true,
    templateText: '記入例とテンプレートをダウンロードして作成できます',
  },
  {
    id: 2,
    title: '代表者身分証明書',
    status: 'not-submitted',
    statusText: '未提出',
    required: true,
    uploadDate: null,
    borderColor: '#E5E7EB',
    statusBgColor: '#F3F4F6',
    statusTextColor: '#364153',
    hasComment: false,
    comment: null,
    hasTemplate: false,
    templateText: null,
  },
  {
    id: 3,
    title: '決算書（直近2期分）',
    status: 'under-review',
    statusText: '確認中',
    required: true,
    uploadDate: '2024-12-13',
    borderColor: '#E5E7EB',
    statusBgColor: '#DBEAFE',
    statusTextColor: '#1447E6',
    hasComment: false,
    comment: null,
    hasTemplate: false,
    templateText: null,
  },
  {
    id: 4,
    title: '履歴事項全部証明書',
    status: 'approved',
    statusText: '承認済',
    required: true,
    uploadDate: '2024-12-05',
    borderColor: '#B9F8CF',
    statusBgColor: '#DCFCE7',
    statusTextColor: '#008236',
    hasComment: false,
    comment: null,
    hasTemplate: false,
    templateText: null,
  },
  {
    id: 5,
    title: '通帳の写し',
    status: 'approved',
    statusText: '承認済',
    required: false,
    uploadDate: '2024-12-10',
    borderColor: '#B9F8CF',
    statusBgColor: '#DCFCE7',
    statusTextColor: '#008236',
    hasComment: false,
    comment: null,
    hasTemplate: false,
    templateText: null,
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: 1,
    title: '履歴事項全部証明書の取得',
    description: '法務局で発行された3ヶ月以内のものが必要です',
    completed: true,
    required: true,
    deadline: '残り2日',
    deadlineColor: '#DC2626',
    linkText: '関連書類を確認',
    borderColor: '#B9F8CF',
  },
  {
    id: 2,
    title: '代表者の身分証明書',
    description: '運転免許証またはマイナンバーカードのコピー',
    completed: false,
    required: true,
    deadline: '残り2日',
    deadlineColor: '#F54900',
    linkText: '関連書類を確認',
    borderColor: '#FFD6A7',
  },
  {
    id: 3,
    title: '事業計画書の初稿作成',
    description: 'テンプレートを参考に事業計画の概要を記入してください',
    completed: false,
    required: true,
    deadline: '残り4日',
    deadlineColor: '#4A5565',
    linkText: '関連書類を確認',
    borderColor: '#E5E7EB',
  },
  {
    id: 4,
    title: 'フォーム返答',
    description: 'フォームに返答してください',
    completed: false,
    required: true,
    deadline: '残り4日',
    deadlineColor: '#4A5565',
    linkText: 'フォーム返答',
    borderColor: '#E5E7EB',
  },
  {
    id: 5,
    title: '決算書（直近2期分）の準備',
    description: '令和4年度、令和5年度の決算書をご用意ください',
    completed: false,
    required: true,
    deadline: '残り6日',
    deadlineColor: '#4A5565',
    linkText: '関連書類を確認',
    borderColor: '#E5E7EB',
  },
  {
    id: 6,
    title: '見積書の取得（3社以上）',
    description: '設備投資に関する相見積もりを取得してください',
    completed: false,
    required: true,
    deadline: '残り9日',
    deadlineColor: '#4A5565',
    linkText: '関連書類を確認',
    borderColor: '#E5E7EB',
  },
  {
    id: 7,
    title: '通帳の写し（任意）',
    description: '補助金振込先の口座情報（表紙と1ページ目）',
    completed: false,
    required: false,
    deadline: null,
    deadlineColor: null,
    linkText: '関連書類を確認',
    borderColor: '#E5E7EB',
  },
];

export const steps: Step[] = [
  {
    id: 1,
    title: '要件確認',
    subtitle: '補助金の対象かチェック',
    description: '事業規模、業種、地域などの基本要件を確認します。行政書士がヒアリングを通じて適格性を判断します。',
    estimate: '目安: 3日',
    status: 'completed',
    iconColor: '#00C950',
    borderColor: '#B9F8CF',
  },
  {
    id: 2,
    title: '必要書類の収集',
    subtitle: '申請に必要な書類を準備',
    description: '履歴事項全部証明書、決算書、見積書など、申請に必要な書類を集めます。不明な点は行政書士にご相談ください。',
    estimate: '目安: 7日',
    status: 'in-progress',
    iconColor: '#2B7FFF',
    borderColor: '#2B7FFF',
    hasShadow: true,
  },
  {
    id: 3,
    title: '申請書の作成',
    subtitle: '事業計画書等を作成',
    description: '事業計画書や経費明細書などを作成します。行政書士が内容を確認し、修正のアドバイスを行います。',
    estimate: '目安: 10日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
  {
    id: 4,
    title: '申請手続',
    subtitle: '電子申請または郵送',
    description: '完成した申請書類を提出します。電子申請の場合は行政書士がサポートします。',
    estimate: '目安: 2日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
  {
    id: 5,
    title: '審査',
    subtitle: '事務局による審査',
    description: '提出した書類が審査されます。追加資料の提出が求められる場合があります。',
    estimate: '目安: 2日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
  {
    id: 6,
    title: '交付決定',
    subtitle: '補助金の交付が決定',
    description: '審査に通過すると、交付決定通知が届きます。事業を開始できます。',
    estimate: '目安: 3日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
  {
    id: 7,
    title: '実績報告',
    subtitle: '事業完了後の報告',
    description: '事業完了後、実績報告書と支出証拠書類を提出します。',
    estimate: '目安: 14日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
  {
    id: 8,
    title: '補助金の受取',
    subtitle: '入金確認',
    description: '実績報告が承認されると、補助金が振り込まれます。',
    estimate: '目安: 30日',
    status: 'not-started',
    iconColor: '#99A1AF',
    borderColor: '#E5E7EB',
  },
];

export const messages: Message[] = [
  {
    id: 1,
    sender: '株式会社グリーンテック',
    senderType: 'company',
    avatar: '山',
    avatarBgColor: '#DBEAFE',
    avatarTextColor: '#1447E6',
    date: '2025. 5. 23. 오후 02:45',
    content: 'はじめまして。株式会社グリーンテックの山本と申します。\n「中小企業デジタル化支援補助金」について申請をお願いしたく、ご連絡いたしました。\n現在、社内の業務効率化を目的として、ITツール導入を検討しております。',
    attachments: [],
  },
  {
    id: 2,
    sender: '行政書士',
    senderType: 'expert',
    avatar: '斎',
    avatarBgColor: '#F3E8FF',
    avatarTextColor: '#8200DB',
    date: '2025. 5. 23. 오후 03:20',
    content: '株式会社グリーンテック　山本様\n\nご連絡いただきありがとうございます。行政書士の斎藤です。\n「中小企業デジタル化支援補助金」について申請をお願いしたく、ご連絡いたしました。\n現在、社内の業務効率化を目的として、ITツール導入を検討しております。',
    attachments: [
      { name: '業務範囲', size: '5 MB' },
      { name: '報酬および支払条件', size: '18 KB' },
      { name: '補助金の採択・交付を保証するものではない旨', size: '18 KB' },
      { name: '業務上の注意事項', size: '10 KB' },
    ],
  },
];

export const members: Member[] = [
  {
    id: 1,
    name: '田中太郎',
    role: 'applicant',
    roleText: '申請者',
    roleBgColor: '#DBEAFE',
    roleBorderColor: '#BEDBFF',
    roleTextColor: '#1447E6',
    canDelete: false,
  },
  {
    id: 2,
    name: '山田三郎',
    role: 'introducer',
    roleText: '紹介者',
    roleBgColor: '#FFE2E2',
    roleBorderColor: '#FFE2E2',
    roleTextColor: '#C10007',
    canDelete: true,
  },
  {
    id: 3,
    name: '佐藤歩',
    role: 'member',
    roleText: 'メンバー',
    roleBgColor: '#E5E7EB',
    roleBorderColor: '#D1D5DC',
    roleTextColor: '#364153',
    canDelete: true,
  },
];

export const projectInfo = {
  title: '小規模事業者持続化補助金',
  status: '進行中',
  needsAction: true,
  location: '東京都・IT・テクノロジー',
  deadline: '2025-01-15',
  assignee: '佐藤美咲 行政書士',
  amount: '最大500万円',
  progress: 60,
};
