import { SubsidyDetails, Expert, TableRow, Subsidy } from './types';
import { createClient } from '@/utils/supabase/client';

// Fetch subsidy details from database
export async function fetchSubsidyById(id: string): Promise<SubsidyDetails | null> {
  const supabase = createClient();
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
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching subsidy:', error);
    return null;
  }

  const now = new Date();
  const endDate = data.application_period_end ? new Date(data.application_period_end) : null;
  const status = endDate && endDate > now ? '公募中' : '公募終了';

  const sortByOrder = <T extends { display_order?: number }>(arr: T[]): T[] =>
    [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  type ActivityRow = { activity_name: string; display_order?: number };
  type ConditionRow = { condition_text: string; display_order?: number };
  type DocumentRow = { document_name: string; display_order?: number };

  return {
    status,
    title: data.title,
    implementingOrganization: (data.m_institutions as { name?: string } | null)?.name || '未設定',
    region: (data.m_regions as { name?: string } | null)?.name || '全国',
    amount: data.amount_description || '未設定',
    applicationPeriod: data.application_period_end ? `~${formatDate(data.application_period_end)}` : '未設定',
    subsidyRate: data.subsidy_rate || '未設定',
    purpose: data.purpose || '',
    targetIndustries: '小売業・サービス業', // TODO: Add target_industries to DB
    officialPage: data.official_page_url || '',
    overview: data.overview || '',
    eligibleActivities: sortByOrder((data.eligible_activities ?? []) as ActivityRow[]).map((a) => a.activity_name),
    eligibilityConditions: sortByOrder((data.eligibility_conditions ?? []) as ConditionRow[]).map((c) => c.condition_text),
    requiredDocuments: sortByOrder((data.required_documents ?? []) as DocumentRow[]).map((d) => d.document_name),
  };
}

// Fetch experts from database
export async function fetchExperts(): Promise<Expert[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      expert_profiles(*)
    `)
    .eq('user_type', 'expert')
    .limit(3);

  if (error || !data) {
    console.error('Error fetching experts:', error);
    return SAMPLE_EXPERTS;
  }

  return data.map((profile) => ({
    id: String(profile.id),
    name: profile.full_name || '担当者',
    rating: 4.1, // TODO: Add rating system
    message: profile.expert_profiles?.one_line_message || 'ご依頼者様の立場に寄り添い、複雑な手続きを分かりやすく丁寧にサポートいたします。',
    services: profile.expert_profiles?.specialties || ['会社・法人', '外国人関連'],
    office: profile.expert_profiles?.office_name || '行政書士事務所',
    registrationYear: profile.expert_profiles?.registration_year ? `${profile.expert_profiles.registration_year}年` : '登録年不明',
    registrationNumber: profile.expert_profiles?.registration_number || '00000000',
  }));
}

// Fetch all subsidies for listing page (サーバー・Supabase から取得)
export async function fetchSubsidies(): Promise<Subsidy[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('subsidies')
    .select(`
      id,
      title,
      amount_description,
      subsidy_rate,
      application_period_end,
      overview,
      m_regions(name),
      m_institutions(name),
      eligible_activities(activity_name, display_order)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching subsidies:', error);
    return [];
  }

  const sortByOrder = <T extends { display_order?: number }>(arr: T[]): T[] =>
    [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  type RelationName = { name?: string } | { name?: string }[] | null | undefined;
  const getRelationName = (v: RelationName): string => {
    if (!v) return '';
    return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
  };

  type SubsidyRow = {
    id: number;
    title: string;
    amount_description?: string | null;
    subsidy_rate?: string | null;
    application_period_end?: string | null;
    overview?: string | null;
    m_regions?: RelationName;
    m_institutions?: RelationName;
    eligible_activities?: { activity_name: string; display_order?: number }[] | null;
  };

  return (data as SubsidyRow[]).map((subsidy) => {
    const now = new Date();
    const endDate = subsidy.application_period_end ? new Date(subsidy.application_period_end) : null;
    const daysUntilDeadline = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const statusTags: string[] = [];
    if (endDate && endDate > now) {
      statusTags.push('公募中');
      if (daysUntilDeadline !== null && daysUntilDeadline <= 14) statusTags.push('締切間近');
    } else {
      statusTags.push('公募終了');
    }

    const regionName = getRelationName(subsidy.m_regions);
    const orgName = getRelationName(subsidy.m_institutions);
    const location = [regionName, orgName].filter(Boolean).join(' ') || '全国';

    return {
      id: String(subsidy.id),
      statusTags,
      title: subsidy.title ?? '',
      location,
      deadline: subsidy.application_period_end ? `申請期限: ${formatDate(subsidy.application_period_end)}` : '期限なし',
      deadlineColor: daysUntilDeadline !== null && daysUntilDeadline <= 14 ? '#E7000B' : '#4A5565',
      amount: subsidy.amount_description ?? '未設定',
      subsidyRate: subsidy.subsidy_rate ?? '未設定',
      overview: subsidy.overview ?? '',
      eligibleActivities: sortByOrder(subsidy.eligible_activities ?? []).map((a) => a.activity_name),
      eligibilityConditions: [],
    };
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// Sample subsidy details for detail page (fallback)
export const SAMPLE_SUBSIDY_DETAILS: SubsidyDetails = {
  status: '公募中',
  title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
  implementingOrganization: '東京都',
  region: '東京都',
  amount: '40万円',
  applicationPeriod: '~2025年12月24日',
  subsidyRate: '2/3',
  purpose: '構成員相互の親睦、連絡及び意見交換等',
  targetIndustries: '小売業・サービス業',
  officialPage: 'https://example.com',
  overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる「チャレンジショップ」を支援します。 ※事前相談を行う必要があります。',
  eligibleActivities: [
    '録音・録画環境の整備',
    'AIを活用したシステム等の導入',
    '外部人材の活用',
  ],
  eligibilityConditions: [
    '都内中小企業・個人事業主',
    '継続的に1年以上事業を行っていること',
    '常時使用する従業員が300人以下',
  ],
  requiredDocuments: [
    '事業計画書',
    '費用明細書',
    '見積書',
    '履歴事項全部証明書',
  ],
};

// Sample experts for detail page (fallback)
export const SAMPLE_EXPERTS: Expert[] = [
  {
    id: '',
    name: '斎藤太郎',
    rating: 4.1,
    message: 'ご依頼者様の立場に寄り添い、複雑な手続きを分かりやすく丁寧にサポートいたします。',
    services: ['会社・法人', '外国人関連'],
    office: '東京会行政書士0000事務所',
    registrationYear: '平成10年7月10日',
    registrationNumber: '88888888',
  },
  {
    id: '',
    name: '斎藤太郎',
    rating: 4.1,
    message: 'ご依頼者様の立場に寄り添い、複雑な手続きを分かりやすく丁寧にサポートいたします。',
    services: ['会社・法人', '外国人関連'],
    office: '東京会行政書士0000事務所',
    registrationYear: '平成10年7月10日',
    registrationNumber: '88888888',
  },
  {
    id: '',
    name: '斎藤太郎',
    rating: 4.1,
    message: 'ご依頼者様の立場に寄り添い、複雑な手続きを分かりやすく丁寧にサポートいたします。',
    services: ['会社・法人', '外国人関連'],
    office: '東京会行政書士0000事務所',
    registrationYear: '平成10年7月10日',
    registrationNumber: '88888888',
  },
];

// Sample subsidies for listing page
export const subsidies: Subsidy[] = [
  {
    id: '1',
    statusTags: ['公募中'],
    title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
    implementingOrganization: '東京都',
    location: '東京都',
    deadline: '申請期限: 2025年12月24日',
    deadlineColor: '#4A5565',
    amount: '40 万円',
    subsidyRate: '2/3',
    overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる',
    eligibleActivities: ['録音・録画環境の整備', 'AIを活用したシステム等の導入', '外部人材の活用'],
    eligibilityConditions: [
      '都内中小企業・個人事業主',
      '継続的に1年以上事業を行っていること',
      '常時使用する従業員が300人以下',
    ],
  },
  {
    id: '2',
    statusTags: ['公募中', '締切間近'],
    title: '小規模事業者持続化補助金',
    implementingOrganization: '中小企業庁',
    location: '全国',
    deadline: '申請期限: 2026年1月15日',
    deadlineColor: '#E7000B',
    amount: '最大200万円',
    subsidyRate: '2/3',
    overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる',
    eligibleActivities: ['販売拡大', 'まちづくり'],
    eligibilityConditions: ['常時使用する従業員が5人以下', '商工会議所の確認を受けた者'],
  },
  {
    id: '3',
    statusTags: ['公募中'],
    title: 'ものづくり補助金',
    location: '全国',
    deadline: '申請期限: 2026年2月1日',
    deadlineColor: '#4A5565',
    amount: '最大1,000万円',
    subsidyRate: '2/3',
    overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる',
    eligibleActivities: ['設備投資', '新製品・サービス開発'],
    eligibilityConditions: ['中小企業・小規模事業者', '一定の事業計画を有していること'],
  },
];

// Filter options
export const industries = ['製造業', 'IT・情報通信', 'サービス業', '小売業', '飲食業', '建設業'];
export const institutions = ['経済産業省', '農林水産省', '厚生労働省', '環境省', '文部科学省'];
export const regionOptions = ['すべて', '東京都', '大阪府', '全国'];
export const amountOptions = ['すべて', '50万円以下', '50万円〜200万円', '200万円以上'];

// Helper function to create table rows from subsidy details
export function createTableRows(subsidyDetails: SubsidyDetails): TableRow[] {
  return [
    { label: '公募ステータス', value: subsidyDetails.status, isBadge: true },
    { label: '実施機関', value: subsidyDetails.implementingOrganization },
    { label: '地域', value: subsidyDetails.region },
    { label: '補助金額', value: subsidyDetails.amount },
    { label: '申請期間', value: subsidyDetails.applicationPeriod },
    { label: '補助率', value: subsidyDetails.subsidyRate },
    { label: '目的', value: subsidyDetails.purpose },
    { label: '対象業種', value: subsidyDetails.targetIndustries },
    { label: '公式公募ページ', value: subsidyDetails.officialPage, isLink: true },
  ];
}
