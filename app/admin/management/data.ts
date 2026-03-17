import { GrantDetails, Expert, Subsidy, Step, TableRow } from './types';

// Region options for dropdown
export const REGION_OPTIONS = [
  '選択してください',
  '全国',
  '東京都',
  '大阪府',
  '神奈川県',
  '愛知県',
  '北海道',
  '福岡県',
  '長崎県',
];

// 申請フロー段階のデフォルト（dashboard/cases の進行ガイドと同一）
export const DEFAULT_STEPS: Step[] = [
  { id: 1, stepName: '事前確認', subtitle: '条件チェック', description: '', estimatedDays: 3 },
  { id: 2, stepName: '事前書類収集', subtitle: '申請書初案作成', description: '', estimatedDays: 7 },
  { id: 3, stepName: '申請手続き', subtitle: '電子申請完了', description: '', estimatedDays: 5 },
  { id: 4, stepName: '交付決定', subtitle: '通知確認', description: '', estimatedDays: 60 },
  { id: 5, stepName: '実績報告', subtitle: '支出証明提出', description: '', estimatedDays: 30 },
  { id: 6, stepName: '補助金請求', subtitle: '入金確認', description: '', estimatedDays: 1 },
];

// Sample grant details for detail page
export const SAMPLE_GRANT_DETAILS: GrantDetails = {
  status: '公募中',
  title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
  applicationStatus: '公募中',
  implementingOrganization: '東京都',
  region: '東京都',
  grantAmount: '40万円',
  applicationPeriod: '~2025年12月24日',
  subsidyRate: '2/3',
  purpose: '構成員相互の親睦、連絡及び意見交換等',
  targetIndustry: '小売業・サービス業',
  officialPage: 'https://example.com',
  overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる「チャレンジショップ」を支援します。※事前相談を行う必要があります。',
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

// Sample experts for detail page
export const SAMPLE_EXPERTS: Expert[] = [
  { id: '1', name: '山田三郎', email: 'sato@office-example.jp', avatarChar: '山' },
  { id: '2', name: '山田三郎', email: 'sato@office-example.jp', avatarChar: '山' },
  { id: '3', name: '山田三郎', email: 'sato@office-example.jp', avatarChar: '山' },
  { id: '4', name: '山田三郎', email: 'sato@office-example.jp', avatarChar: '山' },
  { id: '5', name: '山田三郎', email: 'sato@office-example.jp', avatarChar: '山' },
];

// Sample subsidies for listing page
export const SAMPLE_SUBSIDIES: Subsidy[] = [
  {
    id: '1',
    status: 'open',
    statusLabel: '公募中',
    caseCount: 50,
    title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集',
    amount: '40万円',
    expertCount: 5,
    location: '東京都',
    industry: '東京都',
    deadline: '2025年12月24日',
    overview: '（公財）東京しごと財団（以下「財団」という。）は、「東京都カスタマー・ハラスメント防止条例（以下「条例」という。）」で規定する事業者による措置等を速やかに企業等へ浸透させるため、カスタマーハラスメント対策に関するマニュアルの作成に加え、カスタマーハラスメントを防止するための実践的な取組を促進し、働きやすい職場環境整備を推進します。',
    eligibleActivities: ['販売拡大', 'まちづくり'],
    caseNumber: 10,
  },
  {
    id: '2',
    status: 'closed',
    statusLabel: '募集終了',
    caseCount: 27,
    title: '東京都足立区：「熱中症対策応援金」',
    amount: '400万円',
    expertCount: 3,
    location: '東京都',
    industry: '東京都・全業種',
    deadline: '2025年9月30日',
    overview: '物価高騰が続く中、冷房機器等の稼働その他の熱中症対策のために必要な費用に充てるため、東京都から水道の供給を受けておらず、東京都が実施する....',
    eligibleActivities: ['販売拡大', 'まちづくり'],
    caseNumber: 3,
  },
  {
    id: '3',
    status: 'closed',
    statusLabel: '募集終了',
    caseCount: 16,
    title: '長崎県佐世保市：「佐世保市チャレンジショップ支援事業補助金」',
    amount: '400万円',
    expertCount: 8,
    location: '長崎県',
    industry: '長崎県・小売業・サービス業',
    deadline: '2025年9月30日',
    overview: '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる「チャレンジショップ」を支援します。',
    eligibleActivities: ['新規創業', '販売拡大'],
    caseNumber: 3,
  },
];

// Helper function to create table rows from grant details
export function createTableRows(grantDetails: GrantDetails): TableRow[] {
  return [
    { label: '公募ステータス', value: grantDetails.applicationStatus, isBadge: true },
    { label: '実施機関', value: grantDetails.implementingOrganization },
    { label: '地域', value: grantDetails.region },
    { label: '補助金額', value: grantDetails.grantAmount },
    { label: '申請期間', value: grantDetails.applicationPeriod },
    { label: '補助率', value: grantDetails.subsidyRate },
    { label: '目的', value: grantDetails.purpose },
    { label: '対象業種', value: grantDetails.targetIndustry },
    { label: '公式公募ページ', value: grantDetails.officialPage, isLink: true },
  ];
}
