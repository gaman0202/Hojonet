-- 複数回のヒアリング回答をすべて保持するための履歴カラム
ALTER TABLE case_hearing_submissions
ADD COLUMN IF NOT EXISTS submission_history JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN case_hearing_submissions.submission_history IS '過去のヒアリング提出分 [{ templateId, submittedAt, payload }, ...]';
