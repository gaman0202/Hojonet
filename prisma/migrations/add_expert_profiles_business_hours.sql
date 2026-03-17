-- expert_profiles に営業時間（曜日別）を保存するカラムを追加
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS business_hours JSONB;

COMMENT ON COLUMN expert_profiles.business_hours IS '営業時間（曜日別: monday〜sunday, start/end/isClosed）';
