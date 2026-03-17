-- 補助金ごとの申請フロー段階（管理画面で編集、案件作成時に case_steps にコピー）
CREATE TABLE IF NOT EXISTS subsidy_steps (
  id BIGSERIAL PRIMARY KEY,
  subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  estimated_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subsidy_steps IS '補助金の申請フロー段階（管理画面で設定、案件の進行ガイドに表示）';
CREATE INDEX IF NOT EXISTS idx_subsidy_steps_subsidy_id ON subsidy_steps(subsidy_id);
