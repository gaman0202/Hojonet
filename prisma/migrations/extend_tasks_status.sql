-- ==========================================
-- タスクステータス拡張マイグレーション
-- TASK_FLOW.md の要件に基づくステータス追加
-- ==========================================

-- 現在のステータス: pending, in_progress, review, completed
-- 追加するステータス: submitted, approved, rejected

-- tasks テーブルの status カラムの CHECK 制約を更新
-- 既存の制約を削除
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 新しい制約を追加（拡張されたステータス）
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'review', 'approved', 'rejected', 'completed'));

-- ステータスの意味:
-- pending: 要請됨（タスク作成後、未着手）
-- in_progress: 進行中（作業中）
-- submitted: 제출됨（ユーザーが提出済み、検討待ち）
-- review: 検討中（専門家がレビュー中）
-- approved: 承認됨（専門家が承認、完了）
-- rejected: 기각됨（専門家が却下、再提出必要）
-- completed: 完了（一般的な完了ステータス）

-- 却下理由用のカラムを追加（オプション）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- コメント追加
COMMENT ON COLUMN tasks.status IS 'ステータス（pending:要請됨, in_progress:進行中, submitted:제출됨, review:検討中, approved:承認됨, rejected:기각됨, completed:完了）';
COMMENT ON COLUMN tasks.rejection_reason IS '却下理由（rejected時に設定）';
COMMENT ON COLUMN tasks.submitted_at IS '提出日時';
COMMENT ON COLUMN tasks.reviewed_at IS 'レビュー完了日時';
COMMENT ON COLUMN tasks.reviewer_id IS 'レビュー担当者ID';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_at ON tasks(submitted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer_id ON tasks(reviewer_id);
