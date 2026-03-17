-- 機関マスタテーブル作成
CREATE TABLE IF NOT EXISTS m_institutions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(100),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_m_institutions_name ON m_institutions(name);
CREATE INDEX IF NOT EXISTS idx_m_institutions_position ON m_institutions(position);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_m_institutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_m_institutions_updated_at ON m_institutions;
CREATE TRIGGER update_m_institutions_updated_at
  BEFORE UPDATE ON m_institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_m_institutions_updated_at();

-- 初期データ投入（日本の主要省庁を全て大文字で投入）
INSERT INTO m_institutions (name, code, position) VALUES
  ('内閣府', 'CABINET_OFFICE', 10),
  ('総務省', 'MINISTRY_OF_INTERNAL_AFFAIRS', 20),
  ('法務省', 'MINISTRY_OF_JUSTICE', 30),
  ('外務省', 'MINISTRY_OF_FOREIGN_AFFAIRS', 40),
  ('財務省', 'MINISTRY_OF_FINANCE', 50),
  ('文部科学省', 'MINISTRY_OF_EDUCATION', 60),
  ('厚生労働省', 'MINISTRY_OF_HEALTH', 70),
  ('農林水産省', 'MINISTRY_OF_AGRICULTURE', 80),
  ('経済産業省', 'MINISTRY_OF_ECONOMY', 90),
  ('国土交通省', 'MINISTRY_OF_LAND', 100),
  ('環境省', 'MINISTRY_OF_ENVIRONMENT', 110),
  ('防衛省', 'MINISTRY_OF_DEFENSE', 120),
  ('中小企業庁', 'SMALL_AND_MEDIUM_ENTERPRISE', 130)
ON CONFLICT (name) DO NOTHING;

-- コメント追加
COMMENT ON TABLE m_institutions IS '機関マスタテーブル';
COMMENT ON COLUMN m_institutions.id IS '機関ID（主キー）';
COMMENT ON COLUMN m_institutions.name IS '機関名';
COMMENT ON COLUMN m_institutions.code IS '機関コード';
COMMENT ON COLUMN m_institutions.position IS '表示順序';
COMMENT ON COLUMN m_institutions.created_at IS '作成日時';
COMMENT ON COLUMN m_institutions.updated_at IS '更新日時';

-- RLS（Row Level Security）設定
ALTER TABLE m_institutions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを全て削除
DROP POLICY IF EXISTS "Allow SELECT on m_institutions" ON m_institutions;
DROP POLICY IF EXISTS "Deny INSERT on m_institutions" ON m_institutions;
DROP POLICY IF EXISTS "Deny UPDATE on m_institutions" ON m_institutions;
DROP POLICY IF EXISTS "Deny DELETE on m_institutions" ON m_institutions;

-- SELECTは全員に許可
CREATE POLICY "Allow SELECT on m_institutions" ON m_institutions
  FOR SELECT
  USING (true);

-- INSERT, UPDATE, DELETEは誰も実行できない（拒否）
CREATE POLICY "Deny INSERT on m_institutions" ON m_institutions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny UPDATE on m_institutions" ON m_institutions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny DELETE on m_institutions" ON m_institutions
  FOR DELETE
  USING (false);
