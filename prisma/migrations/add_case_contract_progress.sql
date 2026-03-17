-- 契約進行確認: 専門家が送信する「契約進行確認」内容を1案件1件で保存
CREATE TABLE IF NOT EXISTS case_contract_progress (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    description TEXT,
    payment_terms TEXT,
    scope TEXT,
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(case_id)
);

COMMENT ON TABLE case_contract_progress IS '専門家による契約進行確認の送信内容（1案件1レコード・上書き）';
COMMENT ON COLUMN case_contract_progress.description IS '説明';
COMMENT ON COLUMN case_contract_progress.payment_terms IS '報酬および支払条件';
COMMENT ON COLUMN case_contract_progress.scope IS '業務範囲';
COMMENT ON COLUMN case_contract_progress.submitted_by IS '送信した専門家のプロフィールID';
COMMENT ON COLUMN case_contract_progress.submitted_at IS '送信日時';

CREATE INDEX IF NOT EXISTS idx_case_contract_progress_case_id ON case_contract_progress(case_id);
