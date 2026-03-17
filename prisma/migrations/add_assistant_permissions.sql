-- ==========================================
-- expert_profiles テーブルにアシスタント権限設定カラムを追加
-- ==========================================

-- assistant_permissions JSONB カラムを追加
ALTER TABLE expert_profiles 
ADD COLUMN IF NOT EXISTS assistant_permissions JSONB DEFAULT '{
  "canCreateEditCases": false,
  "canViewCustomerInfo": false,
  "canApproveDocuments": false
}'::jsonb;

COMMENT ON COLUMN expert_profiles.assistant_permissions IS 'アシスタントメンバーの権限設定（案件の作成・編集、顧客情報の閲覧、書類の承認）';
