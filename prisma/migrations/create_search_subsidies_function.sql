-- 補助金検索関数（JSON形式で結果を返す）
-- SupabaseのRPCとして呼び出し可能

-- 既存の関数を削除（戻り値の型を変更するため、またはパラメータ名を変更するため）
DROP FUNCTION IF EXISTS search_subsidies(TEXT, TEXT, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS search_subsidies;

CREATE OR REPLACE FUNCTION search_subsidies(
  p_search_text TEXT DEFAULT NULL, -- 補助金名の検索テキスト
  p_region_name TEXT DEFAULT NULL, -- 地域名（「すべて」の場合はNULL）
  p_industry_names TEXT[] DEFAULT NULL, -- 業種名の配列
  p_institution_names TEXT[] DEFAULT NULL -- 機関名の配列
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH filtered_subsidies AS (
    SELECT
      s.id,
      s.title,
      s.amount_description,
      s.application_period_start,
      s.application_period_end,
      s.subsidy_rate,
      s.overview,
      s.official_page_url,
      get_subsidy_status(s.application_period_start, s.application_period_end) AS status,
      -- 地域情報
      r.name AS region_name,
      r.code AS region_code,
      -- 実施機関情報
      i.name AS institution_name,
      i.code AS institution_code,
      -- 対象業種（配列として取得）
      (
        SELECT json_agg(
          json_build_object(
            'id', mi.id,
            'name', mi.name,
            'code', mi.code
          )
        )::JSONB
        FROM industries si
        JOIN m_industries mi ON si.industry_id = mi.id
        WHERE si.subsidy_id = s.id
      ) AS industries,
      -- 対象となる取組（配列として取得）
      (
        SELECT json_agg(
          json_build_object(
            'id', sea.id,
            'name', sea.activity_name,
            'display_order', sea.display_order
          )
          ORDER BY sea.display_order
        )::JSONB
        FROM eligible_activities sea
        WHERE sea.subsidy_id = s.id
      ) AS eligible_activities,
      -- 対象条件（配列として取得）
      (
        SELECT json_agg(
          json_build_object(
            'id', sec.id,
            'text', sec.condition_text,
            'display_order', sec.display_order
          )
          ORDER BY sec.display_order
        )::JSONB
        FROM eligibility_conditions sec
        WHERE sec.subsidy_id = s.id
      ) AS eligibility_conditions,
      -- 必要書類（配列として取得）
      (
        SELECT json_agg(
          json_build_object(
            'id', srd.id,
            'name', srd.document_name,
            'display_order', srd.display_order
          )
          ORDER BY srd.display_order
        )::JSONB
        FROM required_documents srd
        WHERE srd.subsidy_id = s.id
      ) AS required_documents,
      s.created_at,
      s.updated_at
    FROM subsidies_with_status s
    LEFT JOIN m_regions r ON s.region_id = r.id
    LEFT JOIN m_institutions i ON s.implementing_organization_id = i.id
    WHERE
      -- 補助金名の検索（部分一致、大文字小文字を区別しない）
      (p_search_text IS NULL OR p_search_text = '' OR s.title ILIKE '%' || p_search_text || '%')
      -- 地域フィルタ（「すべて」の場合はNULL）
      AND (p_region_name IS NULL OR p_region_name = 'すべて' OR r.name = p_region_name)
      -- 業種フィルタ（配列が空の場合は全件、指定がある場合は該当する業種を含む補助金）
      AND (
        p_industry_names IS NULL 
        OR array_length(p_industry_names, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM industries si
          JOIN m_industries mi ON si.industry_id = mi.id
          WHERE si.subsidy_id = s.id
            AND mi.name = ANY(p_industry_names)
        )
      )
      -- 機関フィルタ（配列が空の場合は全件、指定がある場合は該当する機関を含む補助金）
      AND (
        p_institution_names IS NULL
        OR array_length(p_institution_names, 1) IS NULL
        OR i.name = ANY(p_institution_names)
      )
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'amount_description', amount_description,
      'application_period_start', application_period_start,
      'application_period_end', application_period_end,
      'subsidy_rate', subsidy_rate,
      'overview', overview,
      'official_page_url', official_page_url,
      'status', status,
      'region', json_build_object(
        'name', region_name,
        'code', region_code
      ),
      'institution', json_build_object(
        'name', institution_name,
        'code', institution_code
      ),
      'industries', industries,
      'eligible_activities', eligible_activities,
      'eligibility_conditions', eligibility_conditions,
      'required_documents', required_documents,
      'created_at', created_at,
      'updated_at', updated_at
    )
    ORDER BY application_period_end ASC NULLS LAST, id ASC
  )::JSONB
  INTO result
  FROM filtered_subsidies;
  
  -- 結果がNULLの場合は空配列を返す
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;

-- コメント追加
COMMENT ON FUNCTION search_subsidies IS '補助金を検索する関数。補助金名、地域、業種、機関でフィルタリング可能。結果はJSON形式で返す。SupabaseのRPCとして呼び出し可能。';
-- 使用例:
-- 
-- 1. すべての補助金を取得
-- SELECT search_subsidies();
-- または
-- SELECT search_subsidies(NULL, NULL, NULL, NULL);
--
-- 2. 補助金名で検索
-- SELECT search_subsidies('カスタマー');
-- または名前付きパラメータを使用
-- SELECT search_subsidies(p_search_text := 'カスタマー');
--
-- 3. 地域でフィルタリング
-- SELECT search_subsidies(NULL, '東京都');
-- または名前付きパラメータを使用
-- SELECT search_subsidies(p_region_name := '東京都');
--
-- 4. 業種でフィルタリング（複数選択）
-- SELECT search_subsidies(NULL, NULL, ARRAY['小売業', 'サービス業']);
-- または名前付きパラメータを使用
-- SELECT search_subsidies(p_industry_names := ARRAY['小売業', 'サービス業']);
--
-- 5. 機関でフィルタリング（複数選択）
-- SELECT search_subsidies(NULL, NULL, NULL, ARRAY['経済産業省']);
-- または名前付きパラメータを使用
-- SELECT search_subsidies(p_institution_names := ARRAY['経済産業省']);
--
-- 6. 複数条件で検索
-- SELECT search_subsidies(
--   'カスタマー',                    -- p_search_text: 補助金名の検索
--   '東京都',                       -- p_region_name: 地域名（「すべて」の場合はNULL）
--   ARRAY['小売業', 'サービス業'],   -- p_industry_names: 業種名の配列
--   ARRAY['経済産業省']             -- p_institution_names: 機関名の配列
-- );
-- または名前付きパラメータを使用
-- SELECT search_subsidies(
--   p_search_text := 'カスタマー',
--   p_region_name := '東京都',
--   p_industry_names := ARRAY['小売業', 'サービス業'],
--   p_institution_names := ARRAY['経済産業省']
-- );
--
-- 注意: パラメータはすべてDEFAULT NULLが設定されているため、省略可能です。
--       省略した場合はNULLとして扱われます。
--
-- 実行例:
-- SELECT search_subsidies();
-- SELECT search_subsidies('カスタマー', '東京都', ARRAY['小売業'], ARRAY['経済産業省']);
SELECT search_subsidies();


SELECT * FROM profiles;
