-- 業種マスタテーブル作成
CREATE TABLE IF NOT EXISTS m_industries (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_m_industries_name ON m_industries(name);
CREATE INDEX IF NOT EXISTS idx_m_industries_position ON m_industries(position);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_m_industries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_m_industries_updated_at ON m_industries;
CREATE TRIGGER update_m_industries_updated_at
  BEFORE UPDATE ON m_industries
  FOR EACH ROW
  EXECUTE FUNCTION update_m_industries_updated_at();

-- 初期データ投入（日本の主要業種を全て大文字で投入）
INSERT INTO m_industries (name, code, position) VALUES
  ('製造業', 'MANUFACTURING', 10),
  ('IT・情報通信', 'IT_COMMUNICATION', 20),
  ('サービス業', 'SERVICE', 30),
  ('小売業', 'RETAIL', 40),
  ('飲食業', 'FOOD_BEVERAGE', 50),
  ('建設業', 'CONSTRUCTION', 60),
  ('卸売業', 'WHOLESALE', 70),
  ('運輸業', 'TRANSPORTATION', 80),
  ('不動産業', 'REAL_ESTATE', 90),
  ('金融業', 'FINANCE', 100),
  ('医療・福祉', 'MEDICAL_WELFARE', 110),
  ('教育・学習支援', 'EDUCATION', 120),
  ('宿泊業', 'ACCOMMODATION', 130),
  ('農業', 'AGRICULTURE', 140),
  ('漁業', 'FISHERY', 150),
  ('林業', 'FORESTRY', 160),
  ('鉱業', 'MINING', 170),
  ('電気・ガス・熱供給', 'UTILITIES', 180),
  ('情報通信業', 'INFORMATION', 190),
  ('学術研究', 'RESEARCH', 200),
  ('複合サービス事業', 'COMPOUND_SERVICE', 210),
  ('公務', 'PUBLIC_SERVICE', 220)
ON CONFLICT (name) DO NOTHING;

-- コメント追加
COMMENT ON TABLE m_industries IS '業種マスタテーブル';
COMMENT ON COLUMN m_industries.id IS '業種ID（主キー）';
COMMENT ON COLUMN m_industries.name IS '業種名';
COMMENT ON COLUMN m_industries.code IS '業種コード';
COMMENT ON COLUMN m_industries.position IS '表示順序';
COMMENT ON COLUMN m_industries.created_at IS '作成日時';
COMMENT ON COLUMN m_industries.updated_at IS '更新日時';

-- RLS（Row Level Security）設定
ALTER TABLE m_industries ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを全て削除
DROP POLICY IF EXISTS "Allow SELECT on m_industries" ON m_industries;
DROP POLICY IF EXISTS "Deny INSERT on m_industries" ON m_industries;
DROP POLICY IF EXISTS "Deny UPDATE on m_industries" ON m_industries;
DROP POLICY IF EXISTS "Deny DELETE on m_industries" ON m_industries;

-- SELECTは全員に許可
CREATE POLICY "Allow SELECT on m_industries" ON m_industries
  FOR SELECT
  USING (true);

-- INSERT, UPDATE, DELETEは誰も実行できない（拒否）
CREATE POLICY "Deny INSERT on m_industries" ON m_industries
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny UPDATE on m_industries" ON m_industries
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny DELETE on m_industries" ON m_industries
  FOR DELETE
  USING (false);
