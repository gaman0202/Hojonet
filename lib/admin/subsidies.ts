/**
 * 管理者向け補助金作成ロジック
 * API route から呼び出し、テスト・再利用可能に分離
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** 申請フロー段階（管理画面 → subsidy_steps → 案件の進行ガイド） */
export interface SubsidyStepInput {
  stepName: string;
  subtitle: string;
  description: string;
  estimatedDays: number;
}

export interface CreateSubsidyInput {
  title: string;
  implementingAgency: string;
  region: string;
  amountDescription: string;
  applicationPeriodEnd?: string;
  subsidyRate?: string;
  purpose?: string;
  officialPageUrl?: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
  steps?: SubsidyStepInput[];
}

export interface CreateSubsidyResult {
  id: number;
}

/** 申請期限文字列を YYYY-MM-DD に変換（YYYY/MM/DD にも対応） */
export function parseApplicationEnd(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const matchJa = trimmed.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (matchJa) {
    const [, y, m, d] = matchJa;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const matchSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (matchSlash) {
    const [, y, m, d] = matchSlash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/** 申請期限の入力チェック（必須・形式・有効な日付） */
export function validateApplicationPeriodEnd(value: string): { valid: boolean; error?: string } {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: '申請期限を入力してください。' };
  }
  const parsed = parseApplicationEnd(trimmed);
  if (!parsed) {
    return {
      valid: false,
      error: '申請期限は「YYYY年MM月DD日」「YYYY-MM-DD」「YYYY/MM/DD」のいずれかで入力してください。',
    };
  }
  const [y, m, d] = parsed.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return { valid: false, error: '有効な日付を入力してください。' };
  }
  return { valid: true };
}

/**
 * 補助金を1件作成し、対象取組・対象条件・必要書類を登録する
 */
export async function createSubsidy(
  supabase: SupabaseClient,
  input: CreateSubsidyInput
): Promise<CreateSubsidyResult> {
  const {
    title,
    implementingAgency,
    region,
    amountDescription,
    applicationPeriodEnd,
    subsidyRate,
    purpose,
    officialPageUrl,
    overview,
    eligibleActivities,
    eligibilityConditions,
    requiredDocuments,
    steps: stepsInput,
  } = input;

  if (!title || !overview) {
    throw new Error('タイトルと概要は必須です。');
  }

  let regionId: number | null = null;
  if (region) {
    const { data: regionRow } = await supabase
      .from('m_regions')
      .select('id')
      .eq('name', region)
      .limit(1)
      .single();
    if (regionRow?.id) regionId = regionRow.id;
  }

  let implementingOrganizationId: number | null = null;
  if (implementingAgency) {
    const { data: orgRow } = await supabase
      .from('m_institutions')
      .select('id')
      .eq('name', implementingAgency)
      .limit(1)
      .single();
    if (orgRow?.id) implementingOrganizationId = orgRow.id;
  }

  const applicationEndDate = applicationPeriodEnd ? parseApplicationEnd(applicationPeriodEnd) : null;

  const { data: subsidy, error: subsidyError } = await supabase
    .from('subsidies')
    .insert({
      title,
      implementing_organization_id: implementingOrganizationId,
      region_id: regionId,
      amount_description: amountDescription || null,
      application_period_start: null,
      application_period_end: applicationEndDate,
      subsidy_rate: subsidyRate || null,
      purpose: purpose || null,
      official_page_url: officialPageUrl || null,
      overview,
    })
    .select('id')
    .single();

  if (subsidyError || !subsidy?.id) {
    throw new Error(subsidyError?.message || '補助金の作成に失敗しました。');
  }

  const subsidyId = subsidy.id;

  if (eligibleActivities?.length) {
    await supabase.from('eligible_activities').insert(
      eligibleActivities.map((name, i) => ({
        subsidy_id: subsidyId,
        activity_name: name,
        display_order: i,
      }))
    );
  }
  if (eligibilityConditions?.length) {
    await supabase.from('eligibility_conditions').insert(
      eligibilityConditions.map((condition_text, i) => ({
        subsidy_id: subsidyId,
        condition_text,
        display_order: i,
      }))
    );
  }
  if (requiredDocuments?.length) {
    await supabase.from('required_documents').insert(
      requiredDocuments.map((document_name, i) => ({
        subsidy_id: subsidyId,
        document_name,
        display_order: i,
      }))
    );
  }

  if (stepsInput?.length) {
    const { error: stepsInsertError } = await supabase.from('subsidy_steps').insert(
      stepsInput.map((s, i) => ({
        subsidy_id: subsidyId,
        step_order: i + 1,
        title: s.stepName || `ステップ${i + 1}`,
        subtitle: s.subtitle || null,
        description: s.description || null,
        estimated_days: s.estimatedDays ?? null,
      }))
    );
    if (stepsInsertError) {
      throw new Error(stepsInsertError.message || '進行段階の保存に失敗しました。');
    }
  }

  return { id: subsidyId };
}

/**
 * 補助金を1件更新し、対象取組・対象条件・必要書類を更新する
 */
export async function updateSubsidy(
  supabase: SupabaseClient,
  id: string,
  input: CreateSubsidyInput
): Promise<CreateSubsidyResult> {
  const {
    title,
    implementingAgency,
    region,
    amountDescription,
    applicationPeriodEnd,
    subsidyRate,
    purpose,
    officialPageUrl,
    overview,
    eligibleActivities,
    eligibilityConditions,
    requiredDocuments,
  } = input;

  if (!title || !overview) {
    throw new Error('タイトルと概要は必須です。');
  }

  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) {
    throw new Error('補助金IDが無効です。');
  }

  let regionId: number | null = null;
  if (region) {
    const { data: regionRow } = await supabase
      .from('m_regions')
      .select('id')
      .eq('name', region)
      .limit(1)
      .single();
    if (regionRow?.id) regionId = regionRow.id;
  }

  let implementingOrganizationId: number | null = null;
  if (implementingAgency) {
    const { data: orgRow } = await supabase
      .from('m_institutions')
      .select('id')
      .eq('name', implementingAgency)
      .limit(1)
      .single();
    if (orgRow?.id) implementingOrganizationId = orgRow.id;
  }

  const applicationEndDate = applicationPeriodEnd ? parseApplicationEnd(applicationPeriodEnd) : null;

  const { error: subsidyError } = await supabase
    .from('subsidies')
    .update({
      title,
      implementing_organization_id: implementingOrganizationId,
      region_id: regionId,
      amount_description: amountDescription || null,
      application_period_end: applicationEndDate,
      subsidy_rate: subsidyRate || null,
      purpose: purpose || null,
      official_page_url: officialPageUrl || null,
      overview,
    })
    .eq('id', numId);

  if (subsidyError) {
    throw new Error(subsidyError.message || '補助金の更新に失敗しました。');
  }

  // Delete existing related records
  await supabase.from('eligible_activities').delete().eq('subsidy_id', numId);
  await supabase.from('eligibility_conditions').delete().eq('subsidy_id', numId);
  await supabase.from('required_documents').delete().eq('subsidy_id', numId);
  const { error: stepsDeleteError } = await supabase
    .from('subsidy_steps')
    .delete()
    .eq('subsidy_id', numId);
  if (stepsDeleteError) {
    throw new Error(stepsDeleteError.message || '進行段階の削除に失敗しました。');
  }

  // Insert new related records
  if (eligibleActivities?.length) {
    await supabase.from('eligible_activities').insert(
      eligibleActivities.map((name, i) => ({
        subsidy_id: numId,
        activity_name: name,
        display_order: i,
      }))
    );
  }
  if (eligibilityConditions?.length) {
    await supabase.from('eligibility_conditions').insert(
      eligibilityConditions.map((condition_text, i) => ({
        subsidy_id: numId,
        condition_text,
        display_order: i,
      }))
    );
  }
  if (requiredDocuments?.length) {
    await supabase.from('required_documents').insert(
      requiredDocuments.map((document_name, i) => ({
        subsidy_id: numId,
        document_name,
        display_order: i,
      }))
    );
  }

  const stepsInput = input.steps;
  if (stepsInput?.length) {
    const { error: stepsInsertError } = await supabase.from('subsidy_steps').insert(
      stepsInput.map((s, i) => ({
        subsidy_id: numId,
        step_order: i + 1,
        title: s.stepName || `ステップ${i + 1}`,
        subtitle: s.subtitle || null,
        description: s.description || null,
        estimated_days: s.estimatedDays ?? null,
      }))
    );
    if (stepsInsertError) {
      throw new Error(stepsInsertError.message || '進行段階の保存に失敗しました。');
    }
  }

  // 該当補助金に紐づく案件の title・amount・deadline を補助金の最新値に同期
  const { error: casesUpdateError } = await supabase
    .from('cases')
    .update({
      title,
      amount: amountDescription || null,
      deadline: applicationEndDate || null,
    })
    .eq('subsidy_id', numId);

  if (casesUpdateError) {
    console.error('Cases sync on subsidy update failed:', casesUpdateError);
    throw new Error(`案件の同期に失敗しました: ${casesUpdateError.message}`);
  }

  return { id: numId };
}

/** 管理画面の詳細表示用（GrantDetails 形式） */
export interface SubsidyDetailForAdmin {
  status: string;
  title: string;
  applicationStatus: string;
  implementingOrganization: string;
  region: string;
  grantAmount: string;
  applicationPeriod: string;
  subsidyRate: string;
  purpose: string;
  targetIndustry: string;
  officialPage: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
  steps?: { id: number; stepName: string; subtitle: string; description: string; estimatedDays: number }[];
}

function formatApplicationPeriod(end: string | null): string {
  if (!end) return '未設定';
  const d = new Date(end);
  return `~${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getStatusLabel(start: string | null, end: string | null): string {
  const now = new Date();
  if (!end) return '公募中';
  const endDate = new Date(end);
  if (endDate < now) return '終了';
  if (start) {
    const startDate = new Date(start);
    if (startDate > now) return '未開始';
  }
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysLeft <= 7 ? '締切間近' : '公募中';
}

/**
 * 補助金1件の詳細を取得（管理画面用）
 */
export async function getSubsidyDetail(
  supabase: SupabaseClient,
  id: string
): Promise<SubsidyDetailForAdmin | null> {
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return null;

  const { data, error } = await supabase
    .from('subsidies')
    .select(`
      *,
      m_regions(name),
      m_institutions(name),
      eligible_activities(activity_name, display_order),
      eligibility_conditions(condition_text, display_order),
      required_documents(document_name, display_order)
    `)
    .eq('id', numId)
    .single();

  if (error || !data) return null;

  type StepRow = { step_order: number; title: string; subtitle: string | null; description: string | null; estimated_days: number | null };
  let stepsData: StepRow[] = [];
  const { data: stepsRows, error: stepsError } = await supabase
    .from('subsidy_steps')
    .select('step_order, title, subtitle, description, estimated_days')
    .eq('subsidy_id', numId)
    .order('step_order', { ascending: true });
  if (!stepsError && stepsRows?.length) stepsData = stepsRows as StepRow[];

  const statusLabel = getStatusLabel(
    data.application_period_start ?? null,
    data.application_period_end ?? null
  );

  const sortByOrder = <T extends { display_order?: number }>(arr: T[]): T[] =>
    [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  type ActivityRow = { activity_name: string; display_order?: number };
  type ConditionRow = { condition_text: string; display_order?: number };
  type DocumentRow = { document_name: string; display_order?: number };
  type RelationName = { name?: string } | { name?: string }[] | null | undefined;
  const getRelationName = (v: RelationName): string => {
    if (!v) return '';
    return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
  };

  return {
    status: statusLabel,
    title: data.title ?? '',
    applicationStatus: statusLabel,
    implementingOrganization: getRelationName(data.m_institutions as RelationName) || '未設定',
    region: getRelationName(data.m_regions as RelationName) || '全国',
    grantAmount: data.amount_description ?? '未設定',
    applicationPeriod: formatApplicationPeriod(data.application_period_end),
    subsidyRate: data.subsidy_rate ?? '未設定',
    purpose: data.purpose ?? '',
    targetIndustry: '未設定',
    officialPage: data.official_page_url ?? '',
    overview: data.overview ?? '',
    eligibleActivities: sortByOrder((data.eligible_activities ?? []) as ActivityRow[]).map((a) => a.activity_name),
    eligibilityConditions: sortByOrder((data.eligibility_conditions ?? []) as ConditionRow[]).map((c) => c.condition_text),
    requiredDocuments: sortByOrder((data.required_documents ?? []) as DocumentRow[]).map((d) => d.document_name),
    steps: stepsData
      .sort((a, b) => a.step_order - b.step_order)
      .map((s, i) => ({
        id: i + 1,
        stepName: s.title,
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        estimatedDays: s.estimated_days ?? 0,
      })),
  };
}
