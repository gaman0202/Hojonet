-- 補助金メインテーブル作成
CREATE TABLE IF NOT EXISTS subsidies (
  id BIGSERIAL PRIMARY KEY, -- 補助金ID（主キー）
  title VARCHAR(500) NOT NULL, -- 補助金名
  implementing_organization_id BIGINT, -- 実施機関ID（m_institutionsへの外部キー）
  region_id BIGINT, -- 地域ID（m_regionsへの外部キー）
  amount_description VARCHAR(200), -- 補助金額の説明（例：「40万円」「最大200万円」）
  application_period_start DATE, -- 申請期間開始日
  application_period_end DATE, -- 申請期間終了日
  subsidy_rate VARCHAR(50), -- 補助率（文字列形式：例「2/3」）
  purpose TEXT, -- 目的
  official_page_url TEXT, -- 公式公募ページURL
  overview TEXT, -- 概要
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 更新日時
  
  -- 外部キー制約
  CONSTRAINT fk_subsidies_implementing_organization
    FOREIGN KEY (implementing_organization_id)
    REFERENCES m_institutions(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_subsidies_region
    FOREIGN KEY (region_id)
    REFERENCES m_regions(id)
    ON DELETE SET NULL
);

-- 補助金と業種の中間テーブル（多対多）
CREATE TABLE IF NOT EXISTS industries (
  id BIGSERIAL PRIMARY KEY, -- ID（主キー）
  subsidy_id BIGINT NOT NULL, -- 補助金ID（subsidiesへの外部キー）
  industry_id BIGINT NOT NULL, -- 業種ID（m_industriesへの外部キー）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 作成日時
  
  -- 外部キー制約
  CONSTRAINT fk_industries_subsidy
    FOREIGN KEY (subsidy_id)
    REFERENCES subsidies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_industries_industry
    FOREIGN KEY (industry_id)
    REFERENCES m_industries(id)
    ON DELETE CASCADE,
  
  -- ユニーク制約（同じ補助金に同じ業種を重複登録できない）
  CONSTRAINT uq_industries
    UNIQUE (subsidy_id, industry_id)
);

-- 対象となる取組テーブル
CREATE TABLE IF NOT EXISTS eligible_activities (
  id BIGSERIAL PRIMARY KEY, -- ID（主キー）
  subsidy_id BIGINT NOT NULL, -- 補助金ID（subsidiesへの外部キー）
  activity_name VARCHAR(500) NOT NULL, -- 取組名
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 作成日時
  
  -- 外部キー制約
  CONSTRAINT fk_eligible_activities_subsidy
    FOREIGN KEY (subsidy_id)
    REFERENCES subsidies(id)
    ON DELETE CASCADE
);

-- 対象条件テーブル
CREATE TABLE IF NOT EXISTS eligibility_conditions (
  id BIGSERIAL PRIMARY KEY, -- ID（主キー）
  subsidy_id BIGINT NOT NULL, -- 補助金ID（subsidiesへの外部キー）
  condition_text TEXT NOT NULL, -- 条件テキスト
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 作成日時
  
  -- 外部キー制約
  CONSTRAINT fk_eligibility_conditions_subsidy
    FOREIGN KEY (subsidy_id)
    REFERENCES subsidies(id)
    ON DELETE CASCADE
);

-- 必要書類テーブル
CREATE TABLE IF NOT EXISTS required_documents (
  id BIGSERIAL PRIMARY KEY, -- ID（主キー）
  subsidy_id BIGINT NOT NULL, -- 補助金ID（subsidiesへの外部キー）
  document_name VARCHAR(500) NOT NULL, -- 書類名
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 作成日時
  
  -- 外部キー制約
  CONSTRAINT fk_required_documents_subsidy
    FOREIGN KEY (subsidy_id)
    REFERENCES subsidies(id)
    ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subsidies_implementing_organization_id ON subsidies(implementing_organization_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_region_id ON subsidies(region_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_application_period_end ON subsidies(application_period_end);
CREATE INDEX IF NOT EXISTS idx_industries_subsidy_id ON industries(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_industries_industry_id ON industries(industry_id);
CREATE INDEX IF NOT EXISTS idx_eligible_activities_subsidy_id ON eligible_activities(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_conditions_subsidy_id ON eligibility_conditions(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_required_documents_subsidy_id ON required_documents(subsidy_id);

-- updated_atを自動更新するトリガー関数（補助金メインテーブル用）
CREATE OR REPLACE FUNCTION update_subsidies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subsidies_updated_at ON subsidies;
CREATE TRIGGER update_subsidies_updated_at
  BEFORE UPDATE ON subsidies
  FOR EACH ROW
  EXECUTE FUNCTION update_subsidies_updated_at();

-- ステータスを計算する関数
-- 締切間近の定義: 終了日の7日前から終了日まで
CREATE OR REPLACE FUNCTION get_subsidy_status(
  period_start DATE,
  period_end DATE
)
RETURNS VARCHAR(50) AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  days_until_end INTEGER;
BEGIN
  -- 期間が設定されていない場合はNULLを返す
  IF period_end IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 終了日を過ぎている場合は「終了」
  IF current_date > period_end THEN
    RETURN '終了';
  END IF;
  
  -- 開始日が設定されていて、まだ開始していない場合は「未開始」
  IF period_start IS NOT NULL AND current_date < period_start THEN
    RETURN '未開始';
  END IF;
  
  -- 終了日までの日数を計算
  days_until_end := period_end - current_date;
  
  -- 7日以内（締切間近）の場合は「締切間近」
  IF days_until_end <= 7 AND days_until_end >= 0 THEN
    RETURN '締切間近';
  END IF;
  
  -- それ以外は「公募中」
  RETURN '公募中';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 補助金情報を取得するビュー（ステータスを含む）
CREATE OR REPLACE VIEW subsidies_with_status AS
SELECT 
  s.*,
  get_subsidy_status(s.application_period_start, s.application_period_end) AS status
FROM subsidies s;

-- テーブルコメント追加
COMMENT ON TABLE subsidies IS '補助金メインテーブル';
COMMENT ON TABLE industries IS '補助金と業種の中間テーブル（多対多）';
COMMENT ON TABLE eligible_activities IS '対象となる取組テーブル';
COMMENT ON TABLE eligibility_conditions IS '対象条件テーブル';
COMMENT ON TABLE required_documents IS '必要書類テーブル';

-- 関数とビューのコメント
COMMENT ON FUNCTION get_subsidy_status IS '補助金のステータスを計算する関数。申請期間の開始日・終了日と現在日時を比較して「未開始」「公募中」「締切間近」「終了」を返す';
COMMENT ON VIEW subsidies_with_status IS '補助金情報にステータスを含むビュー。通常はこのビューを使用して補助金情報を取得する';
