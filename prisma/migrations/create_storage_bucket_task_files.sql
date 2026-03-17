-- ==========================================
-- Supabase Storage バケット作成: task-files
-- タスク添付ファイルのアップロード用（API は supabaseAdmin でアップロード）
-- ==========================================
-- Dashboard で作成する場合: Storage → New bucket → 名前 "task-files"

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-files', 'task-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;
