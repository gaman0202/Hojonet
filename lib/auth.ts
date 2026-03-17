/**
 * 認証関連関数
 * - 会員登録、ログイン、ログアウト、セッション、パスワード検証・再設定など
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  SignUpRequest,
  SignUpResponse,
  SignInResponse,
  PasswordValidationResult,
  PasswordErrorCode,
} from '@/types/auth';

/** Supabase設定確認。未設定の場合はエラーをthrow */
function ensureSupabaseConfigured(): void {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabaseが設定されていません。環境変数を確認してください。');
  }
}

/**
 * パスワードの有効性検証
 * - 8文字以上
 * - 大文字を含む
 * - 小文字を含む
 * - 数字を含む
 * - 特殊文字(@$!%*?&)を含む
 */
const PASSWORD_ERROR_CODES: PasswordErrorCode[] = [
  'MinLength',
  'Lowercase',
  'Uppercase',
  'Number',
  'Special',
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const errorCodes: PasswordErrorCode[] = [];

  if (password.length < 8) {
    errors.push('パスワードは8文字以上で入力してください。');
    errorCodes.push('MinLength');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含めてください。');
    errorCodes.push('Lowercase');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含めてください。');
    errorCodes.push('Uppercase');
  }
  if (!/\d/.test(password)) {
    errors.push('数字を含めてください。');
    errorCodes.push('Number');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('特殊文字(@$!%*?&)を含めてください。');
    errorCodes.push('Special');
  }

  return { isValid: errors.length === 0, errors, errorCodes };
}

/** パスワードを正規表現で一括チェック */
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return passwordRegex.test(password);
}

/** Supabaseのエラーメッセージをユーザー向けの日本語に変換 */
function getAuthErrorMessage(message: string, status?: number): string {
  const m = (message || '').toLowerCase();

  if (status === 422) {
    if (m.includes('weak password')) return 'パスワードが弱すぎます。8文字以上、大/小文字・数字・特殊文字を含めてください。';
    if (m.includes('email')) return 'メールアドレスの形式を確認してください。';
  }
  if (status === 429) return 'しばらくしてから再度お試しください。';
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch') || m.includes('load failed')) {
    return 'ネットワーク接続を確認してから再度お試しください。';
  }

  const errorMap: Record<string, string> = {
    'user already registered': 'このメールアドレスは既に登録されています。',
    'invalid login credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'email not confirmed': 'メールアドレスの認証が完了していません。',
    'invalid email': '有効なメールアドレスを入力してください。',
    'signup disabled': '現在会員登録は受け付けておりません。',
    'email rate limit exceeded': 'リクエストが多すぎます。しばらくしてから再度お試しください。',
    'too many requests': 'しばらくしてから再度お試しください。',
    'database error saving new user': '会員登録処理中にエラーが発生しました。しばらくしてから再度お試しください。',
    'database error': 'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
    'user not found': 'このメールアドレスは登録されていません。',
    'email not found': 'このメールアドレスは登録されていません。',
    'rate limit': 'リセットメールの送信回数が上限に達しました。しばらく待ってから再度お試しください。',
    'same_password': '現在のパスワードと同じです。別のパスワードを設定してください。',
    'different from the old': '現在のパスワードと同じです。別のパスワードを設定してください。',
    'same as': '現在のパスワードと同じです。別のパスワードを設定してください。',
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (m.includes(key)) return value;
  }
  return '一時的なエラーが発生しました。しばらくしてから再度お試しください。';
}

/**
 * メール/パスワードで会員登録
 */
export async function signUpWithEmail({ email, password, redirectTo, metadata }: SignUpRequest): Promise<SignUpResponse> {
  ensureSupabaseConfigured();

  if (!isValidPassword(password)) {
    throw new Error('パスワードは8文字以上、大/小文字・数字・特殊文字(@$!%*?&)を含めてください。');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo || `${appUrl}/login`,
      data: metadata,
    },
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error.message, error.status));
  }
  return { user: data.user, session: data.session };
}

/**
 * メール/パスワードでログイン
 * - Authログイン後にprofilesを取得（profiles.id = auth.users.id）
 */
export async function signInWithEmail(email: string, password: string): Promise<SignInResponse> {
  ensureSupabaseConfigured();

  const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({ email, password });

  if (authError) {
    throw new Error(getAuthErrorMessage(authError.message, authError.status));
  }
  if (!authData.user || !authData.session) {
    throw new Error('ログインに失敗しました。');
  }

  const { data: profileData } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  return {
    session: authData.session,
    user: {
      ...authData.user,
      profile: profileData ?? null,
    },
  };
}

/**
 * ログアウト（セッション終了・ローカルストレージのトークン削除）
 */
export async function signOut(): Promise<void> {
  const clearStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1];
      if (ref) localStorage.removeItem(`sb-${ref}-auth-token`);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) localStorage.removeItem(key);
      });
    } catch {
      // 無視
    }
  };

  if (!isSupabaseConfigured() || !supabase) {
    clearStorage();
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error && error.status !== 400 && error.status !== 401 && error.status !== 404) {
      throw new Error(error.message || 'ログアウト中にエラーが発生しました。');
    }
  } finally {
    clearStorage();
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

/**
 * 現在のセッションを取得
 */
export async function getSession() {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * パスワード再設定メールを送信
 */
export async function sendResetPasswordEmail(email: string, redirectTo?: string): Promise<void> {
  ensureSupabaseConfigured();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const { error } = await supabase!.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${appUrl}/update-password`,
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error.message, error.status));
  }
}

/**
 * パスワード変更（ログイン中）
 */
export async function updatePassword(newPassword: string) {
  ensureSupabaseConfigured();

  if (!isValidPassword(newPassword)) {
    throw new Error('パスワードは8文字以上、大文字・小文字・数字・特殊文字を含めてください。');
  }

  const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
  if (sessionError || !session) {
    throw new Error('セッションの有効期限が切れています。再度ログインしてください。');
  }

  const { data, error } = await supabase!.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(getAuthErrorMessage(error.message, error.status));
  }
  return data.user;
}
