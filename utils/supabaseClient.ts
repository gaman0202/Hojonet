/**
 * ブラウザ用 Supabase クライアント（単一インスタンス）。
 * 新規コードでは createClient() を @/utils/supabase/client から直接使うことを推奨。
 * @see docs/PROJECT_STRUCTURE.md
 */
import { createClient } from './supabase/client';

export const supabase = createClient();