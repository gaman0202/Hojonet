-- case_hearing_submissions: 専門家による「確認済み」用カラム追加
ALTER TABLE case_hearing_submissions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_comment TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN case_hearing_submissions.reviewed_at IS '専門家が確認済みにした日時';
COMMENT ON COLUMN case_hearing_submissions.review_comment IS '確認時のコメント';
COMMENT ON COLUMN case_hearing_submissions.reviewer_id IS '確認した専門家のプロフィールID';
