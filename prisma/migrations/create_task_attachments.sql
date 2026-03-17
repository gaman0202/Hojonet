-- ==========================================
-- task_attachments: タスク添付ファイル
-- file_upload タイプのタスク用
-- ==========================================

CREATE TABLE IF NOT EXISTS task_attachments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(2048) NOT NULL,
    file_size BIGINT,                   -- バイト単位
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE task_attachments IS 'タスクに添付されたファイル（file_uploadタイプ用）';
COMMENT ON COLUMN task_attachments.task_id IS 'タスクID';
COMMENT ON COLUMN task_attachments.file_name IS 'ファイル名';
COMMENT ON COLUMN task_attachments.file_path IS 'Storageファイルパス';
COMMENT ON COLUMN task_attachments.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN task_attachments.uploaded_by IS 'アップロードしたユーザーID';
COMMENT ON COLUMN task_attachments.uploaded_at IS 'アップロード日時';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);
