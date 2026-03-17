import { Customer } from './types';

export const customers: Customer[] = [
  {
    id: '1',
    name: '田中太郎',
    nameInitial: '田',
    email: 'tanaka@tech.co.jp',
    phone: '03-1234-5678',
    company: '株式会社ABC',
    industry: 'IT・テクノロジー',
    location: '東京都',
    activeCases: 1,
  },
  {
    id: '2',
    name: '鈴木花子',
    nameInitial: '鈴',
    email: 'suzuki@suzuki-shop.jp',
    phone: '06-9876-5432',
    company: '株式会社ABC',
    industry: '小売業',
    location: '大阪府',
    activeCases: 1,
  },
  {
    id: '3',
    name: '佐々木一郎',
    nameInitial: '佐',
    email: 'sasaki@sasakifactory.co.jp',
    phone: '052-1111-2222',
    company: '株式会社ABC',
    industry: '製造業',
    location: '愛知県',
    activeCases: 1,
  },
  {
    id: '4',
    name: '高橋美咲',
    nameInitial: '高',
    email: 'takahashi@design-office.jp',
    phone: '03-2222-3333',
    company: '株式会社ABC',
    industry: 'デザイン',
    location: '東京都',
    activeCases: 1,
  },
  {
    id: '5',
    name: '佐々木一郎',
    nameInitial: '佐',
    email: 'sasaki@sumakifactory.co.jp',
    phone: '052-1111-2222',
    company: '株式会社ABC',
    industry: '製造業',
    location: '愛知県',
    activeCases: 1,
  },
  {
    id: '6',
    name: '高橋美咲',
    nameInitial: '高',
    email: 'takahashi@design-office.jp',
    phone: '03-2222-3333',
    company: '株式会社ABC',
    industry: 'デザイン',
    location: '東京都',
    activeCases: 1,
  },
];

export const industries = ['全業種', 'IT・テクノロジー', '小売業', '製造業', 'デザイン', 'サービス業'];

export const totalCustomers = 24;
