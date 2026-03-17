-- ==========================================
-- Figmaデザインに基づくスキーマ拡張マイグレーション
-- 
-- このファイルはFigmaデザインの分析結果を元に
-- 既存スキーマを拡張・改善します
-- ==========================================

-- ==========================================
-- 1. テンプレートカテゴリのENUM定義
-- ==========================================

-- タスクテンプレートカテゴリ（テンプレート管理_タスク画面より）
-- ヒアリング, 書類, 打合せ, 確認, 申請, 報告, 準備
CREATE TYPE task_template_category AS ENUM (
    'hearing',      -- ヒアリング
    'document',     -- 書類
    'meeting',      -- 打合せ
    'confirmation', -- 確認
    'application',  -- 申請
    'report',       -- 報告
    'preparation'   -- 準備
);

-- 書類テンプレートカテゴリ（テンプレート管理_書類画面より）
-- 補助金申請, 事業計画, 財務書類, 外部システム, 参考資料
CREATE TYPE document_template_category AS ENUM (
    'subsidy_application',  -- 補助金申請
    'business_plan',        -- 事業計画
    'financial',            -- 財務書類
    'external_system',      -- 外部システム
    'reference'             -- 参考資料
);

-- 書類審査ステータス（進行中案件詳細_書類管理画面より）
-- 差戻し, 未提出, 確認中, 承認済
CREATE TYPE document_review_status AS ENUM (
    'not_submitted',  -- 未提出
    'submitted',      -- 提出済み
    'reviewing',      -- 確認中
    'approved',       -- 承認済
    'rejected'        -- 差戻し
);

-- ==========================================
-- 2. templatesテーブル拡張
-- ==========================================

-- タスクテンプレート用カテゴリ追加
ALTER TABLE templates ADD COLUMN IF NOT EXISTS task_category task_template_category;

-- 書類テンプレート用カテゴリ追加
ALTER TABLE templates ADD COLUMN IF NOT EXISTS document_category document_template_category;

-- 担当役割（タスクテンプレート用、Figmaの「行政書士/アシスタント」に対応）
ALTER TABLE templates ADD COLUMN IF NOT EXISTS default_assignee_role VARCHAR(50);

-- 優先度のデフォルト値（高/中/低）
ALTER TABLE templates ADD COLUMN IF NOT EXISTS default_priority VARCHAR(20) 
    CHECK (default_priority IN ('high', 'medium', 'low'));

-- 関連書類タイプ（タスクテンプレートで関連書類を指定する場合）
ALTER TABLE templates ADD COLUMN IF NOT EXISTS related_document_types JSONB;

COMMENT ON COLUMN templates.task_category IS 'タスクテンプレートのカテゴリ（hearing, document, meeting, confirmation, application, report, preparation）';
COMMENT ON COLUMN templates.document_category IS '書類テンプレートのカテゴリ（subsidy_application, business_plan, financial, external_system, reference）';
COMMENT ON COLUMN templates.default_assignee_role IS 'デフォルト担当役割（expert: 行政書士, assistant: アシスタント, customer: 申請者）';
COMMENT ON COLUMN templates.default_priority IS 'デフォルト優先度（high, medium, low）';
COMMENT ON COLUMN templates.related_document_types IS '関連する書類タイプのリスト';

-- ==========================================
-- 3. tasksテーブル拡張
-- ==========================================

-- タスクカテゴリ追加（テンプレートと同じカテゴリを使用）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category task_template_category;

-- 関連書類ID（チェックリストの「関連書類を確認」リンク用）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL;

-- テンプレートID（このタスクの元となったテンプレート）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES templates(id) ON DELETE SET NULL;

-- 表示順序（チェックリストの順序管理）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

COMMENT ON COLUMN tasks.category IS 'タスクカテゴリ';
COMMENT ON COLUMN tasks.linked_document_id IS '関連書類ID';
COMMENT ON COLUMN tasks.template_id IS '元となったテンプレートID';
COMMENT ON COLUMN tasks.display_order IS '表示順序';

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_document_id ON tasks(linked_document_id);
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_id);

-- ==========================================
-- 4. documentsテーブル拡張
-- ==========================================

-- テンプレートID（この書類の元となったテンプレート）
ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES templates(id) ON DELETE SET NULL;

-- 専門家コメント（進行中案件詳細_書類管理の「行政書士からのコメント」）
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expert_comment TEXT;

-- コメント日時
ALTER TABLE documents ADD COLUMN IF NOT EXISTS comment_at TIMESTAMPTZ;

-- コメントした専門家ID
ALTER TABLE documents ADD COLUMN IF NOT EXISTS commenter_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 書類カテゴリ
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category document_template_category;

COMMENT ON COLUMN documents.template_id IS '元となったテンプレートID';
COMMENT ON COLUMN documents.expert_comment IS '専門家（行政書士）からのコメント';
COMMENT ON COLUMN documents.comment_at IS 'コメント日時';
COMMENT ON COLUMN documents.commenter_id IS 'コメントした専門家のID';
COMMENT ON COLUMN documents.category IS '書類カテゴリ';

CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- ==========================================
-- 5. casesテーブル拡張
-- ==========================================

-- 対応必要フラグ（ダッシュボードの「対応必要」バッジ）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT FALSE;

-- 未読メッセージ数（パフォーマンス用のキャッシュカラム）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS unread_message_count INTEGER DEFAULT 0;

-- 未完了タスク数（パフォーマンス用のキャッシュカラム）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS pending_task_count INTEGER DEFAULT 0;

-- 緊急タスク数（期限間近のタスク数）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS urgent_task_count INTEGER DEFAULT 0;

-- 最終活動日時
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN cases.needs_attention IS '対応が必要かどうか';
COMMENT ON COLUMN cases.unread_message_count IS '未読メッセージ数（キャッシュ）';
COMMENT ON COLUMN cases.pending_task_count IS '未完了タスク数（キャッシュ）';
COMMENT ON COLUMN cases.urgent_task_count IS '緊急タスク数（キャッシュ）';
COMMENT ON COLUMN cases.last_activity_at IS '最終活動日時';

CREATE INDEX IF NOT EXISTS idx_cases_needs_attention ON cases(needs_attention);
CREATE INDEX IF NOT EXISTS idx_cases_last_activity_at ON cases(last_activity_at);

-- ==========================================
-- 6. メッセージ既読状態テーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS message_read_status (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

COMMENT ON TABLE message_read_status IS 'メッセージの既読状態を管理';
COMMENT ON COLUMN message_read_status.message_id IS 'メッセージID';
COMMENT ON COLUMN message_read_status.user_id IS '読んだユーザーID';
COMMENT ON COLUMN message_read_status.read_at IS '既読日時';

CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- ==========================================
-- 7. 顧客メモテーブル（顧客管理詳細のメモ機能）
-- ==========================================

CREATE TABLE IF NOT EXISTS customer_notes (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- メモを書いた専門家
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- 対象顧客
    content TEXT NOT NULL,  -- メモ内容
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(expert_id, customer_id)  -- 専門家ごとに顧客1人につき1つのメモ
);

COMMENT ON TABLE customer_notes IS '専門家が顧客に対して残すメモ';
COMMENT ON COLUMN customer_notes.expert_id IS 'メモを書いた専門家ID';
COMMENT ON COLUMN customer_notes.customer_id IS '対象顧客ID';
COMMENT ON COLUMN customer_notes.content IS 'メモ内容';

CREATE INDEX IF NOT EXISTS idx_customer_notes_expert_id ON customer_notes(expert_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);

-- トリガー追加
DROP TRIGGER IF EXISTS update_customer_notes_updated_at ON customer_notes;
CREATE TRIGGER update_customer_notes_updated_at
    BEFORE UPDATE ON customer_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. 顧客-専門家関係テーブル（顧客管理用）
-- ==========================================

CREATE TABLE IF NOT EXISTS expert_customers (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    introducer_id BIGINT REFERENCES introducers(id) ON DELETE SET NULL,  -- 紹介者
    
    -- 統計情報（パフォーマンス用キャッシュ）
    total_cases INTEGER DEFAULT 0,        -- 総案件数
    active_cases INTEGER DEFAULT 0,       -- 進行中案件数
    completed_cases INTEGER DEFAULT 0,    -- 完了案件数
    review_cases INTEGER DEFAULT 0,       -- 審査中案件数
    
    first_contact_at TIMESTAMPTZ,         -- 初回接触日
    last_activity_at TIMESTAMPTZ,         -- 最終活動日
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(expert_id, customer_id)
);

COMMENT ON TABLE expert_customers IS '専門家と顧客の関係（顧客管理用）';
COMMENT ON COLUMN expert_customers.expert_id IS '専門家ID';
COMMENT ON COLUMN expert_customers.customer_id IS '顧客ID';
COMMENT ON COLUMN expert_customers.introducer_id IS '紹介者ID';
COMMENT ON COLUMN expert_customers.total_cases IS '総案件数（キャッシュ）';
COMMENT ON COLUMN expert_customers.active_cases IS '進行中案件数（キャッシュ）';
COMMENT ON COLUMN expert_customers.completed_cases IS '完了案件数（キャッシュ）';
COMMENT ON COLUMN expert_customers.review_cases IS '審査中案件数（キャッシュ）';

CREATE INDEX IF NOT EXISTS idx_expert_customers_expert_id ON expert_customers(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_customers_customer_id ON expert_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_expert_customers_introducer_id ON expert_customers(introducer_id);

-- トリガー追加
DROP TRIGGER IF EXISTS update_expert_customers_updated_at ON expert_customers;
CREATE TRIGGER update_expert_customers_updated_at
    BEFORE UPDATE ON expert_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 9. 申請フローステップ定義テーブル
-- （案件登録画面の「進行段階設定」より）
-- ==========================================

CREATE TABLE IF NOT EXISTS application_flow_templates (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subsidy_id BIGINT REFERENCES subsidies(id) ON DELETE SET NULL,  -- NULL=汎用テンプレート
    
    name VARCHAR(255) NOT NULL,           -- テンプレート名
    is_default BOOLEAN DEFAULT FALSE,     -- デフォルトテンプレートか
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE application_flow_templates IS '申請フローのテンプレート';
COMMENT ON COLUMN application_flow_templates.expert_id IS '専門家ID';
COMMENT ON COLUMN application_flow_templates.subsidy_id IS '補助金ID（NULLの場合は汎用）';
COMMENT ON COLUMN application_flow_templates.name IS 'テンプレート名';
COMMENT ON COLUMN application_flow_templates.is_default IS 'デフォルトテンプレートフラグ';

CREATE INDEX IF NOT EXISTS idx_application_flow_templates_expert_id ON application_flow_templates(expert_id);
CREATE INDEX IF NOT EXISTS idx_application_flow_templates_subsidy_id ON application_flow_templates(subsidy_id);

-- フローステップテンプレート
CREATE TABLE IF NOT EXISTS application_flow_steps (
    id BIGSERIAL PRIMARY KEY,
    flow_template_id BIGINT NOT NULL REFERENCES application_flow_templates(id) ON DELETE CASCADE,
    
    step_order INTEGER NOT NULL,          -- 順序
    title VARCHAR(255) NOT NULL,          -- ステップ名（例：「要件確認」「必要書類の収集」）
    subtitle VARCHAR(255),                -- サブタイトル（例：「補助金の対象かチェック」）
    description TEXT,                     -- 詳細説明
    estimated_days INTEGER,               -- 目安日数
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE application_flow_steps IS '申請フローのステップ定義';
COMMENT ON COLUMN application_flow_steps.flow_template_id IS 'フローテンプレートID';
COMMENT ON COLUMN application_flow_steps.step_order IS '表示順序';
COMMENT ON COLUMN application_flow_steps.title IS 'ステップ名';
COMMENT ON COLUMN application_flow_steps.subtitle IS 'サブタイトル';
COMMENT ON COLUMN application_flow_steps.description IS '詳細説明';
COMMENT ON COLUMN application_flow_steps.estimated_days IS '目安日数';

CREATE INDEX IF NOT EXISTS idx_application_flow_steps_flow_template_id ON application_flow_steps(flow_template_id);

-- トリガー追加
DROP TRIGGER IF EXISTS update_application_flow_templates_updated_at ON application_flow_templates;
CREATE TRIGGER update_application_flow_templates_updated_at
    BEFORE UPDATE ON application_flow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 10. profilesテーブル拡張（マイページより）
-- ==========================================

-- 統計情報（マイページの「進行中の案件」「採択済み」「申請総数」「採択率」）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats_total_applications INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats_active_cases INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats_accepted_cases INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats_acceptance_rate DECIMAL(5,2) DEFAULT 0;

-- 最終ログイン日時
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.stats_total_applications IS '申請総数（キャッシュ）';
COMMENT ON COLUMN profiles.stats_active_cases IS '進行中案件数（キャッシュ）';
COMMENT ON COLUMN profiles.stats_accepted_cases IS '採択済み案件数（キャッシュ）';
COMMENT ON COLUMN profiles.stats_acceptance_rate IS '採択率（キャッシュ）';
COMMENT ON COLUMN profiles.last_login_at IS '最終ログイン日時';

-- ==========================================
-- 11. ヒアリング質問の改善
-- （案件登録画面のヒアリングテンプレート設定より）
-- ==========================================

-- 質問のセクション管理
ALTER TABLE hearing_questions ADD COLUMN IF NOT EXISTS section VARCHAR(255);

-- ヘルプテキスト
ALTER TABLE hearing_questions ADD COLUMN IF NOT EXISTS help_text TEXT;

-- 条件付き表示（前の質問の回答によって表示/非表示）
ALTER TABLE hearing_questions ADD COLUMN IF NOT EXISTS conditional_display JSONB;

COMMENT ON COLUMN hearing_questions.section IS '質問のセクション名';
COMMENT ON COLUMN hearing_questions.help_text IS 'ヘルプテキスト（入力のヒント）';
COMMENT ON COLUMN hearing_questions.conditional_display IS '条件付き表示設定（JSON形式）';

-- ==========================================
-- 12. 紹介者詳細情報の拡張
-- （紹介者管理画面より）
-- ==========================================

-- 紹介者の業種
ALTER TABLE introducers ADD COLUMN IF NOT EXISTS industry_type VARCHAR(100);

-- 紹介実績数（キャッシュ）
ALTER TABLE introducers ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- 紹介者のステータス
ALTER TABLE introducers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive'));

COMMENT ON COLUMN introducers.industry_type IS '紹介者の業種';
COMMENT ON COLUMN introducers.total_referrals IS '紹介実績数（キャッシュ）';
COMMENT ON COLUMN introducers.status IS 'ステータス（active, inactive）';

-- ==========================================
-- 13. 通知設定の拡張（設定_通知設定画面より）
-- ==========================================

-- LINE通知設定
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS line_notification BOOLEAN DEFAULT FALSE;

-- メール通知設定
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS email_notification BOOLEAN DEFAULT TRUE;

-- 通知頻度（即時/日次まとめ/週次まとめ）
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS notification_frequency VARCHAR(20) DEFAULT 'immediate'
    CHECK (notification_frequency IN ('immediate', 'daily', 'weekly'));

COMMENT ON COLUMN notification_settings.line_notification IS 'LINE通知を受け取るか';
COMMENT ON COLUMN notification_settings.email_notification IS 'メール通知を受け取るか';
COMMENT ON COLUMN notification_settings.notification_frequency IS '通知頻度（immediate, daily, weekly）';

-- ==========================================
-- 14. 操作履歴テーブルの拡張（操作履歴画面より）
-- ==========================================

-- グローバル操作履歴（案件に紐づかない操作も記録）
CREATE TABLE IF NOT EXISTS global_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    action_type VARCHAR(100) NOT NULL,    -- ログイン、案件作成、書類アップロードなど
    action_description TEXT,              -- 操作の説明
    
    target_type VARCHAR(100),             -- 対象の種類（case, document, profile等）
    target_id VARCHAR(100),               -- 対象のID
    
    ip_address INET,                      -- IPアドレス
    user_agent TEXT,                      -- ユーザーエージェント
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE global_activity_logs IS 'グローバル操作履歴（セキュリティ・監査用）';
COMMENT ON COLUMN global_activity_logs.user_id IS 'ユーザーID';
COMMENT ON COLUMN global_activity_logs.action_type IS '操作種別';
COMMENT ON COLUMN global_activity_logs.action_description IS '操作の説明';
COMMENT ON COLUMN global_activity_logs.target_type IS '対象の種類';
COMMENT ON COLUMN global_activity_logs.target_id IS '対象のID';
COMMENT ON COLUMN global_activity_logs.ip_address IS 'IPアドレス';
COMMENT ON COLUMN global_activity_logs.user_agent IS 'ユーザーエージェント';

CREATE INDEX IF NOT EXISTS idx_global_activity_logs_user_id ON global_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_global_activity_logs_action_type ON global_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_global_activity_logs_created_at ON global_activity_logs(created_at);

-- ==========================================
-- 15. ビュー作成
-- ==========================================

-- 専門家向けダッシュボード用ビュー
CREATE OR REPLACE VIEW dashboard_cases_summary AS
SELECT 
    c.expert_group_id,
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE c.status IN ('consultation', 'hearing', 'doc_prep', 'review')) as active_cases,
    COUNT(*) FILTER (WHERE c.needs_attention = TRUE) as attention_needed_cases,
    COUNT(*) FILTER (WHERE c.deadline <= CURRENT_DATE + INTERVAL '7 days' AND c.status NOT IN ('accepted', 'rejected')) as deadline_approaching_cases
FROM cases c
GROUP BY c.expert_group_id;

COMMENT ON VIEW dashboard_cases_summary IS 'ダッシュボード用の案件サマリービュー';

-- 顧客管理用ビュー
CREATE OR REPLACE VIEW customer_list_view AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.company_name,
    p.industry,
    p.location,
    ec.expert_id,
    ec.total_cases,
    ec.active_cases,
    ec.completed_cases,
    ec.last_activity_at,
    i.name as introducer_name
FROM profiles p
JOIN expert_customers ec ON p.id = ec.customer_id
LEFT JOIN introducers i ON ec.introducer_id = i.id
WHERE p.user_type = 'customer';

COMMENT ON VIEW customer_list_view IS '顧客管理一覧用ビュー';

-- 進行中案件一覧用ビュー
CREATE OR REPLACE VIEW active_cases_view AS
SELECT 
    c.id,
    c.title,
    c.status,
    c.progress_rate,
    c.deadline,
    c.needs_attention,
    c.unread_message_count,
    c.pending_task_count,
    c.amount,
    s.title as subsidy_title,
    s.amount_description as max_amount,
    p.full_name as assignee_name,
    p.user_type as assignee_role
FROM cases c
JOIN subsidies s ON c.subsidy_id = s.id
LEFT JOIN profiles p ON c.assignee_id = p.id
WHERE c.status NOT IN ('accepted', 'rejected');

COMMENT ON VIEW active_cases_view IS '進行中案件一覧用ビュー';

-- ==========================================
-- 16. 便利な関数
-- ==========================================

-- 案件の進捗率を計算する関数
CREATE OR REPLACE FUNCTION calculate_case_progress(p_case_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    progress INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_tasks, completed_tasks
    FROM tasks
    WHERE case_id = p_case_id;
    
    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;
    
    progress := (completed_tasks * 100 / total_tasks);
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_case_progress IS '案件の進捗率を計算（完了タスク数/全タスク数）';

-- 案件の統計情報を更新する関数
CREATE OR REPLACE FUNCTION update_case_statistics(p_case_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_pending_tasks INTEGER;
    v_urgent_tasks INTEGER;
    v_unread_messages INTEGER;
    v_progress INTEGER;
BEGIN
    -- 未完了タスク数
    SELECT COUNT(*) INTO v_pending_tasks
    FROM tasks
    WHERE case_id = p_case_id AND status != 'completed';
    
    -- 緊急タスク数（期限7日以内）
    SELECT COUNT(*) INTO v_urgent_tasks
    FROM tasks
    WHERE case_id = p_case_id 
      AND status != 'completed'
      AND deadline <= CURRENT_DATE + INTERVAL '7 days';
    
    -- 進捗率計算
    v_progress := calculate_case_progress(p_case_id);
    
    -- 案件テーブル更新
    UPDATE cases SET
        pending_task_count = v_pending_tasks,
        urgent_task_count = v_urgent_tasks,
        progress_rate = v_progress,
        needs_attention = (v_urgent_tasks > 0 OR v_pending_tasks > 0),
        last_activity_at = NOW()
    WHERE id = p_case_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_case_statistics IS '案件の統計情報（タスク数、進捗率等）を更新';

-- 顧客統計情報を更新する関数
CREATE OR REPLACE FUNCTION update_customer_statistics(p_expert_id UUID, p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_active INTEGER;
    v_completed INTEGER;
    v_review INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('consultation', 'hearing', 'doc_prep')),
        COUNT(*) FILTER (WHERE status = 'accepted'),
        COUNT(*) FILTER (WHERE status IN ('review', 'submitted'))
    INTO v_total, v_active, v_completed, v_review
    FROM cases
    WHERE expert_group_id = p_expert_id AND user_group_id = p_customer_id;
    
    INSERT INTO expert_customers (expert_id, customer_id, total_cases, active_cases, completed_cases, review_cases, last_activity_at)
    VALUES (p_expert_id, p_customer_id, v_total, v_active, v_completed, v_review, NOW())
    ON CONFLICT (expert_id, customer_id) DO UPDATE SET
        total_cases = v_total,
        active_cases = v_active,
        completed_cases = v_completed,
        review_cases = v_review,
        last_activity_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_customer_statistics IS '顧客の統計情報を更新';

-- ==========================================
-- 17. トリガー：タスク変更時に案件統計を更新
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_update_case_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_case_statistics(OLD.case_id);
        RETURN OLD;
    ELSE
        PERFORM update_case_statistics(NEW.case_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_case_stats_on_task_change ON tasks;
CREATE TRIGGER update_case_stats_on_task_change
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_update_case_on_task_change();

-- ==========================================
-- 18. RLS無効化（開発用、本番では有効化推奨）
-- ==========================================

ALTER TABLE message_read_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expert_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_flow_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_flow_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_activity_logs DISABLE ROW LEVEL SECURITY;
