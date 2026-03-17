-- ==========================================
-- Supabase Storage: profile-icons バケット（公開・プロフィール写真用）
-- 専門家のプロフィール写真を表示するため public=true で作成
-- ==========================================
-- Dashboard で作成する場合: Storage → New bucket → 名前 "profile-icons" → Public をオン

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('profile-icons', 'profile-icons', true, 5242880)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
