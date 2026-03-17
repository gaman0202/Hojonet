import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl) {
  throw new Error('環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません。');
}

if (!supabaseServiceRoleKey) {
  throw new Error('環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。');
}

// Supabase Admin Client (Service Role Keyを使用)
// このクライアントは管理者権限を持ち、RLSをバイパスできます
// サーバーサイドでのみ使用してください
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
