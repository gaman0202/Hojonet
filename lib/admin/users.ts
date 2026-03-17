/**
 * 管理者向けユーザー作成ロジック
 * API route から呼び出し、テスト・再利用可能に分離
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  companyName?: string;
  phone?: string;
  businessType?: string;
  location?: string;
  industry?: string;
  employees?: string;
  userType?: string; // customer, member, expert, assistant, admin
  /**
   * profiles.group_id を明示指定したい場合に使用。
   * - customer/expert/admin: 通常は自分の id（未指定なら自動で self）
   * - member: 所属 customer の id
   * - assistant: 所属 expert の id
   */
  groupId?: string;
}

export interface CreateUserResult {
  id: string;
  email: string | undefined;
  user_metadata: Record<string, unknown>;
  created_at: string | undefined;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/** profiles の NOT NULL 制約違反メッセージを日本語に変換 */
const PROFILES_COLUMN_JA: Record<string, string> = {
  location: '所在地',
  phone: '電話番号',
  business_type: '事業形態',
  employees: '従業員数',
  full_name: '氏名',
  email: 'メールアドレス',
  company_name: '会社名',
  industry: '業種',
  user_type: 'ユーザー種別',
  group_id: 'グループ',
};

function profileErrorToJapanese(message: string): string {
  const m = message.match(/null value in column "([^"]+)" of relation "profiles" violates not-null constraint/i);
  if (m) {
    const col = m[1].toLowerCase();
    const label = PROFILES_COLUMN_JA[col] ?? col;
    return `プロフィールの「${label}」は必須です。`;
  }
  return message;
}

/** Auth まわりの英語エラーメッセージを日本語に変換 */
const AUTH_ERROR_JA: Record<string, string> = {
  'a user with this email address has already been registered': 'このメールアドレスは既に登録されています。',
  'user already registered': 'このメールアドレスは既に登録されています。',
  'invalid email or password': 'メールアドレスまたはパスワードが正しくありません。',
  'email not confirmed': 'メールアドレスの認証が完了していません。',
  'password should be at least': 'パスワードは8文字以上で入力してください。',
  'failed to create user': 'ユーザーの作成に失敗しました。',
  'signup disabled': '現在会員登録は受け付けておりません。',
  'rate limit': 'リクエストが多すぎます。しばらくしてから再度お試しください。',
};

function authErrorToJapanese(message: string): string {
  const lower = message.toLowerCase();
  for (const [en, ja] of Object.entries(AUTH_ERROR_JA)) {
    if (lower.includes(en)) return ja;
  }
  return message;
}

/**
 * バリデーションのみ実行（入力チェック）
 */
export function validateCreateUserInput(input: CreateUserInput): void {
  if (!input.email || !input.password) {
    throw new Error('メールアドレスとパスワードは必須です。');
  }
  if (!isValidEmail(input.email)) {
    throw new Error('メールアドレスの形式が正しくありません。');
  }
  if (!isValidPassword(input.password)) {
    throw new Error('パスワードは8文字以上で入力してください。');
  }

  const userType = input.userType || 'customer';
  if ((userType === 'member' || userType === 'assistant' || userType === 'introducer') && !input.groupId) {
    throw new Error('メンバー・アシスタント・紹介者は所属グループの選択が必須です。');
  }
}

/**
 * 管理者としてユーザーを1件作成し、profiles にレコードを挿入する
 */
export async function createUser(
  supabase: SupabaseClient,
  input: CreateUserInput
): Promise<CreateUserResult> {
  validateCreateUserInput(input);

  const userType = input.userType || 'customer';

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      userType,
      name: input.name,
      companyName: input.companyName,
      businessType: input.businessType,
      location: input.location,
      industry: input.industry,
      employees: input.employees,
      phone: input.phone,
    },
  });

  if (error) {
    if (
      error.message.includes('already registered') ||
      error.message.includes('User already registered') ||
      /this email address has already been registered/i.test(error.message)
    ) {
      throw new Error('このメールアドレスのユーザーは既に存在します。');
    }
    throw new Error(authErrorToJapanese(error.message || 'ユーザーの作成に失敗しました。'));
  }

  if (!data.user) {
    throw new Error('ユーザー作成に失敗しました。データが返されませんでした。');
  }

  const groupId = input.groupId || data.user.id;

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    email: data.user.email,
    full_name: input.name || null,
    company_name: input.companyName || null,
    phone: input.phone ?? '', // NOT NULL 制約対応: 未入力時は空文字
    business_type: input.businessType ?? '', // NOT NULL 制約対応
    location: input.location || null,
    industry: input.industry || null,
    employees: input.employees ?? '', // NOT NULL 制約対応
    user_type: userType,
    group_id: groupId,
  });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    const msg = profileError.message || 'プロフィールの登録に失敗しました';
    throw new Error(profileErrorToJapanese(msg));
  }

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata ?? {},
    created_at: data.user.created_at,
  };
}
