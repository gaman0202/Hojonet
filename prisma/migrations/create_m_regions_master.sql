-- 地域マスタテーブル作成
CREATE TABLE IF NOT EXISTS m_regions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_m_regions_name ON m_regions(name);
CREATE INDEX IF NOT EXISTS idx_m_regions_position ON m_regions(position);

-- updated_atを自動更新するトリガー（インライン関数を使用）
CREATE OR REPLACE FUNCTION update_m_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_m_regions_updated_at ON m_regions;
CREATE TRIGGER update_m_regions_updated_at
  BEFORE UPDATE ON m_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_m_regions_updated_at();

-- 初期データ投入（全国の都道府県を全て大文字で投入）
INSERT INTO m_regions (name, code, position) VALUES
  ('すべて', 'ALL', 0),
  ('全国', 'NATIONWIDE', 1),
  ('北海道', 'HOKKAIDO', 2),
  ('青森県', 'AOMORI', 3),
  ('岩手県', 'IWATE', 4),
  ('宮城県', 'MIYAGI', 5),
  ('秋田県', 'AKITA', 6),
  ('山形県', 'YAMAGATA', 7),
  ('福島県', 'FUKUSHIMA', 8),
  ('茨城県', 'IBARAKI', 9),
  ('栃木県', 'TOCHIGI', 10),
  ('群馬県', 'GUNMA', 11),
  ('埼玉県', 'SAITAMA', 12),
  ('千葉県', 'CHIBA', 13),
  ('東京都', 'TOKYO', 14),
  ('神奈川県', 'KANAGAWA', 15),
  ('新潟県', 'NIIGATA', 16),
  ('富山県', 'TOYAMA', 17),
  ('石川県', 'ISHIKAWA', 18),
  ('福井県', 'FUKUI', 19),
  ('山梨県', 'YAMANASHI', 20),
  ('長野県', 'NAGANO', 21),
  ('岐阜県', 'GIFU', 22),
  ('静岡県', 'SHIZUOKA', 23),
  ('愛知県', 'AICHI', 24),
  ('三重県', 'MIE', 25),
  ('滋賀県', 'SHIGA', 26),
  ('京都府', 'KYOTO', 27),
  ('大阪府', 'OSAKA', 28),
  ('兵庫県', 'HYOGO', 29),
  ('奈良県', 'NARA', 30),
  ('和歌山県', 'WAKAYAMA', 31),
  ('鳥取県', 'TOTTORI', 32),
  ('島根県', 'SHIMANE', 33),
  ('岡山県', 'OKAYAMA', 34),
  ('広島県', 'HIROSHIMA', 35),
  ('山口県', 'YAMAGUCHI', 36),
  ('徳島県', 'TOKUSHIMA', 37),
  ('香川県', 'KAGAWA', 38),
  ('愛媛県', 'EHIME', 39),
  ('高知県', 'KOCHI', 40),
  ('福岡県', 'FUKUOKA', 41),
  ('佐賀県', 'SAGA', 42),
  ('長崎県', 'NAGASAKI', 43),
  ('熊本県', 'KUMAMOTO', 44),
  ('大分県', 'OITA', 45),
  ('宮崎県', 'MIYAZAKI', 46),
  ('鹿児島県', 'KAGOSHIMA', 47),
  ('沖縄県', 'OKINAWA', 48)
ON CONFLICT (name) DO NOTHING;

-- コメント追加
COMMENT ON TABLE m_regions IS '地域マスタテーブル';
COMMENT ON COLUMN m_regions.id IS '地域ID（主キー）';
COMMENT ON COLUMN m_regions.name IS '地域名';
COMMENT ON COLUMN m_regions.code IS '地域コード';
COMMENT ON COLUMN m_regions.position IS '表示順序';
COMMENT ON COLUMN m_regions.created_at IS '作成日時';
COMMENT ON COLUMN m_regions.updated_at IS '更新日時';

-- RLS（Row Level Security）設定
ALTER TABLE m_regions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを全て削除
DROP POLICY IF EXISTS "Allow SELECT on m_regions" ON m_regions;
DROP POLICY IF EXISTS "Deny INSERT on m_regions" ON m_regions;
DROP POLICY IF EXISTS "Deny UPDATE on m_regions" ON m_regions;
DROP POLICY IF EXISTS "Deny DELETE on m_regions" ON m_regions;

-- SELECTは全員に許可
CREATE POLICY "Allow SELECT on m_regions" ON m_regions
  FOR SELECT
  USING (true);

-- INSERT, UPDATE, DELETEは誰も実行できない（拒否）
CREATE POLICY "Deny INSERT on m_regions" ON m_regions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny UPDATE on m_regions" ON m_regions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny DELETE on m_regions" ON m_regions
  FOR DELETE
  USING (false);
