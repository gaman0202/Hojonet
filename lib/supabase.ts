/**
 * Supabaseクライアント・設定ユーティリティ
 * - 認証などクライアントで使う単一クライアント
 * - SSR/クッキー連携のため createBrowserClient を使用
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 環境変数でSupabaseが設定されているか */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** ブラウザ用Supabaseクライアント。環境変数が無い場合はnull（authレイヤーで ensureSupabaseConfigured() により事前チェック） */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : (null as ReturnType<typeof createBrowserClient> | null);
