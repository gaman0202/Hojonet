-- 補助金データのINSERT文
-- マスタテーブル（m_regions、m_institutions、m_industries）が既に作成されていることを前提とします
-- 実行前に、マスタテーブルにデータが登録されていることを確認してください

BEGIN;

-- 補助金1: 令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項
-- 注意: 実施機関が「東京都」となっていますが、m_institutionsテーブルに「東京都」が存在しない場合は、
-- 適切な実施機関名に変更するか、m_institutionsテーブルに「東京都」を追加してください
WITH inserted_subsidy AS (
  INSERT INTO subsidies (
    title,
    implementing_organization_id,
    region_id,
    amount_description,
    application_period_start,
    application_period_end,
    subsidy_rate,
    purpose,
    official_page_url,
    overview
  ) VALUES (
    '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
--     (SELECT id FROM m_institutions WHERE name = '東京都' LIMIT 1),
--     (SELECT id FROM m_regions WHERE name = '東京都' LIMIT 1),
 1 , --内閣府
    15, -- 東京都
    '40万円',
    '2025-01-01', -- 開始日は仮設定（実際のデータに合わせて変更してください）
    '2025-12-24',
    '2/3',
    '構成員相互の親睦、連絡及び意見交換等',
    'https://example.com',
    '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる「チャレンジショップ」を支援します。 ※事前相談を行う必要があります。'
  )
  RETURNING id
),
-- 補助金1の対象業種を登録
inserted_industries AS (
  INSERT INTO industries (subsidy_id, industry_id)
  SELECT 
    s.id,
    i.id
  FROM inserted_subsidy s
  CROSS JOIN m_industries i
  WHERE i.name IN ('小売業', 'サービス業')
  ON CONFLICT (subsidy_id, industry_id) DO NOTHING
  RETURNING subsidy_id
),
-- 補助金1の対象となる取組を登録
inserted_activities AS (
  INSERT INTO eligible_activities (subsidy_id, activity_name, display_order)
  SELECT 
    s.id AS subsidy_id,
    v.activity_name,
    v.display_order
  FROM inserted_subsidy s
  CROSS JOIN (
    VALUES
      ('録音・録画環境の整備', 1),
      ('AIを活用したシステム等の導入', 2),
      ('外部人材の活用', 3)
  ) AS v(activity_name, display_order)
  RETURNING subsidy_id
),
-- 補助金1の対象条件を登録
inserted_conditions AS (
  INSERT INTO eligibility_conditions (subsidy_id, condition_text, display_order)
  SELECT 
    s.id AS subsidy_id,
    v.condition_text,
    v.display_order
  FROM inserted_subsidy s
  CROSS JOIN (
    VALUES
      ('都内中小企業・個人事業主', 1),
      ('継続的に1年以上事業を行っていること', 2),
      ('常時使用する従業員が300人以下', 3)
  ) AS v(condition_text, display_order)
  RETURNING subsidy_id
)
-- 補助金1の必要書類を登録
INSERT INTO required_documents (subsidy_id, document_name, display_order)
SELECT 
  s.id AS subsidy_id,
  v.document_name,
  v.display_order
FROM inserted_subsidy s
CROSS JOIN (
  VALUES
    ('事業計画書', 1),
    ('費用明細書', 2),
    ('見積書', 3),
    ('履歴事項全部証明書', 4)
) AS v(document_name, display_order);

COMMIT;



