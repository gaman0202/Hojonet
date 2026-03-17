/**
 * 認証関連の型定義
 */
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpRequest {
  email: string;
  password: string;
  redirectTo?: string;
  /** user_metadataに保存する追加データ */
  metadata?: Record<string, unknown>;
}

export interface SignUpResponse {
  user: User | null;
  session: Session | null;
}

export interface SignInResponse {
  session: Session;
  user: User & { profile?: Record<string, unknown> | null };
}

export type PasswordErrorCode = 'MinLength' | 'Lowercase' | 'Uppercase' | 'Number' | 'Special';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  errorCodes: PasswordErrorCode[];
}
