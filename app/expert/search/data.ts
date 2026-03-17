import { Subsidy } from './types';

export const subsidies: Subsidy[] = [
  {
    id: 1,
    status: ['公募中'],
    title: '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
    institution: '東京都',
    region: '東京都',
    deadline: '2025年12月24日',
    maxAmount: '40万円',
    subsidyRate: '2/3',
    overview:
      '（公財）東京しごと財団（以下「財団」という。）は、「東京都カスタマー・ハラスメント防止条例（以下「条例」という。）」で規定する事業者による措置等を速やかに企業等へ浸透させるため、カスタマーハラスメント対策に関するマニュアルの作成に加え、カスタマーハラスメントを防止するための実践的な取組を促進し、働きやすい職場環境整備を推進します。',
    eligibleActivities: ['録音・録画環境の整備', 'AIを活用したシステム等の導入', '外部人材の活用'],
    eligibilityConditions: [
      '都内中小企業・個人事業主',
      '継続的に1年以上事業を行っていること',
      '常時使用する従業員が300人以下',
    ],
  },
  {
    id: 2,
    status: ['公募中', '締切間近'],
    title: '小規模事業者持続化補助金',
    institution: '中小企業庁',
    region: '全国',
    deadline: '2025年1月15日',
    deadlineUrgent: true,
    maxAmount: '最大200万円',
    subsidyRate: '2/3',
    overview: '小規模事業者が経営計画を策定し、販路開拓等に取り組む際の費用を支援',
    eligibleActivities: ['販売拡大', 'まちづくり'],
    eligibilityConditions: ['常時使用する従業員が5人以下', '商工会議所の確認を受けた者'],
  },
];

export const regionOptions = ['すべて', '東京都', '大阪府', '全国'];
export const amountOptions = ['すべて', '100万円以下', '100万円〜500万円', '500万円以上'];
