-- 追加ヒアリング機能削除: submission_history カラムを削除
ALTER TABLE case_hearing_submissions
DROP COLUMN IF EXISTS submission_history;
