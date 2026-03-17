import { FormData } from './types';

export const initialFormData: FormData = {
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  phone: '',
  businessType: '',
  companyName: '',
  location: '',
  industry: '',
  employees: '',
  representativeName: '',
  contactName: '',
};

export const locations = ['東京都', '大阪府', '愛知県', '福岡県'];
export const industries = ['IT・情報通信業', '製造業', '小売業', 'サービス業'];
export const employeesOptions = ['1-10名', '11-20名', '21-50名', '51-100名', '100名以上'];
export const businessTypes = ['株式会社', '合同会社', '個人事業主', '創業予定'];