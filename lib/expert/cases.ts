/**
 * 専門家向け案件（カンバン）取得ロジック
 * ページ・API から呼び出し、テスト・再利用可能に分離
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// --- 公開型（UI で利用） ---
export interface CaseCard {
  id: number;
  userName: string;
  userInitial: string;
  amount: string;
  deadline: string;
  progress: number;
  progressColor?: string;
  urgentLevel?: number;
  chatCount?: number;
  needsAction?: boolean;
  hasButtons?: boolean;
}

export interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  cards: CaseCard[];
}

export interface ExpertKanbanResult {
  subsidyTitle: string;
  kanbanColumns: KanbanColumn[];
  error?: string;
}

/** cases.status とカンバン列のマッピング（DB 値 → 表示ラベル） */
export const KANBAN_STATUS_CONFIG: { id: string; title: string }[] = [
  { id: 'consultation', title: '相談受付' },
  { id: 'hearing', title: 'ヒアリング' },
  { id: 'doc_prep', title: '書類準備' },
  { id: 'review', title: '審査中' },
  { id: 'submitted', title: '申請完了' },
  { id: 'accepted', title: '採択' },
  { id: 'rejected', title: '却下' },
];

// --- 内部型 ---
type CaseRow = {
  id: number;
  user_group_id: string;
  status: string;
  progress_rate?: number | null;
  amount?: string | null;
  deadline?: string | null;
  needs_attention?: boolean | null;
  unread_message_count?: number | null;
  pending_task_count?: number | null;
};

type ProfileName = { full_name?: string | null; company_name?: string | null; email?: string | null };

// --- 内部ヘルパー ---
function formatDeadline(dateStr: string | null | undefined): string {
  if (!dateStr) return '期限なし';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getProgressColor(progress: number): string {
  if (progress >= 90) return '#00C950';
  if (progress >= 60) return '#2B7FFF';
  if (progress >= 30) return '#F0B100';
  return '#99A1AF';
}

function caseRowToCard(row: CaseRow, profileMap: Map<string, ProfileName>): CaseCard {
  const profile = profileMap.get(row.user_group_id);
  const name = profile?.full_name?.trim() || profile?.company_name?.trim() || profile?.email?.trim() || '—';
  const initial = name.charAt(0) || '—';
  const progress = row.progress_rate ?? 0;
  const deadlineDays = row.deadline
    ? Math.ceil((new Date(row.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const urgentLevel =
    deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0 ? (deadlineDays <= 3 ? 2 : 1) : undefined;
  const showButtons = ['hearing', 'doc_prep'].includes(row.status);

  return {
    id: row.id,
    userName: name,
    userInitial: initial,
    amount: row.amount || '—',
    deadline: formatDeadline(row.deadline),
    progress,
    progressColor: getProgressColor(progress),
    urgentLevel,
    chatCount: (row.unread_message_count ?? 0) > 0 ? row.unread_message_count! : undefined,
    needsAction: row.needs_attention ?? false,
    hasButtons: showButtons,
  };
}

function buildKanbanColumns(
  cases: CaseRow[],
  profileMap: Map<string, ProfileName>,
  effectiveStatusByCaseId?: Map<number, string>
): KanbanColumn[] {
  const byStatus = new Map<string, CaseRow[]>();
  for (const c of cases) {
    const s = effectiveStatusByCaseId?.get(c.id) ?? c.status ?? 'consultation';
    if (!byStatus.has(s)) byStatus.set(s, []);
    byStatus.get(s)!.push(c);
  }
  return KANBAN_STATUS_CONFIG.map((col) => {
    const rows = byStatus.get(col.id) || [];
    return {
      id: col.id,
      title: col.title,
      count: rows.length,
      cards: rows.map((row) => caseRowToCard(row, profileMap)),
    };
  });
}

/**
 * 専門家カンバン用に補助金タイトルと案件列を取得する
 */
export async function getExpertKanbanData(
  supabase: SupabaseClient,
  params: { subsidyId: number; expertGroupId: string }
): Promise<ExpertKanbanResult> {
  const { subsidyId, expertGroupId } = params;

  const subsidyRes = await supabase
    .from('subsidies')
    .select('title')
    .eq('id', subsidyId)
    .single();

  const casesRes = await supabase
    .from('cases')
    .select(
      'id, user_group_id, status, progress_rate, amount, deadline, needs_attention, unread_message_count, pending_task_count'
    )
    .eq('subsidy_id', subsidyId)
    .or(`expert_group_id.eq.${expertGroupId},expert_group_id.is.null`)
    .order('updated_at', { ascending: false });

  const subsidyTitle =
    subsidyRes.data?.title ?? (subsidyRes.error ? '' : '（無題）');
  const rows = (casesRes.data ?? []) as CaseRow[];
  const caseRows = casesRes.error ? [] : rows;

  // submitted の案件で進行段階がすべて完了している場合は 採択 として表示
  const effectiveStatusByCaseId = new Map<number, string>();
  const submittedCases = caseRows.filter((c) => c.status === 'submitted');
  if (submittedCases.length > 0) {
    const caseIds = submittedCases.map((c) => c.id);
    const { data: stepsRows } = await supabase
      .from('case_steps')
      .select('case_id, status')
      .in('case_id', caseIds);
    const stepsByCaseId = new Map<number, { status: string }[]>();
    for (const s of stepsRows ?? []) {
      const row = s as { case_id: number; status: string };
      if (!stepsByCaseId.has(row.case_id)) stepsByCaseId.set(row.case_id, []);
      stepsByCaseId.get(row.case_id)!.push(row);
    }
    for (const c of submittedCases) {
      const stepsList = stepsByCaseId.get(c.id) ?? [];
      if (stepsList.length > 0 && stepsList.every((s) => s.status === 'completed')) {
        effectiveStatusByCaseId.set(c.id, 'accepted');
      }
    }
  }

  const userIds = [...new Set(caseRows.map((r) => r.user_group_id).filter(Boolean))];
  const profileMap = new Map<string, ProfileName>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, email')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, company_name: p.company_name, email: p.email });
    }
  }
  // user_group_id が group_id の場合は id で見つからないので、group_id でも検索
  const missingIds = userIds.filter((uid) => !profileMap.has(uid));
  if (missingIds.length > 0) {
    const { data: byGroup } = await supabase
      .from('profiles')
      .select('id, group_id, full_name, company_name, email')
      .in('group_id', missingIds);
    for (const p of byGroup ?? []) {
      if (p.group_id && !profileMap.has(p.group_id)) {
        profileMap.set(p.group_id, { full_name: p.full_name, company_name: p.company_name, email: p.email });
      }
    }
  }

  const kanbanColumns = buildKanbanColumns(caseRows, profileMap, effectiveStatusByCaseId);
  const error = casesRes.error ? casesRes.error.message : undefined;

  return {
    subsidyTitle,
    kanbanColumns,
    ...(error && { error }),
  };
}

/** 案件が0件のときの空カンバン列（初期表示用） */
export function getEmptyKanbanColumns(): KanbanColumn[] {
  return KANBAN_STATUS_CONFIG.map((col) => ({
    id: col.id,
    title: col.title,
    count: 0,
    cards: [],
  }));
}
