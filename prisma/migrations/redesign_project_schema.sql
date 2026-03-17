-- ==========================================
-- DB スキーマ再設計
-- 現行Next.jsプロジェクト構造に基づいた設計
-- ==========================================

-- ==========================================
-- 既存profilesテーブルの拡張（変更なし、既に適用済み）
-- user_type: customer, member, expert, assistant, admin
-- group_id: グループ管理用
-- ==========================================

-- ==========================================
-- 1. expert_profiles: 専門家詳細プロフィール
-- ==========================================
-- 既存テーブル維持（既に作成済み）
-- office_name, office_address, registration_number, association,
-- registration_year, specialties, one_line_message, memo

-- ==========================================
-- 2. cases: 案件テーブル（core entity）
-- Next.jsのCase, CaseCard, CaseInfoタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS cases (
    id BIGSERIAL PRIMARY KEY,
    subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE RESTRICT,
    
    -- グループベースの参照（既存plan準拠）
    user_group_id UUID NOT NULL,  -- 申請者グループ（profiles.group_id）
    expert_group_id UUID,          -- 専門家グループ（profiles.group_id、オプション）
    
    title VARCHAR(500) NOT NULL,   -- 案件名（補助金名 + 申請者名など）
    
    -- ステータス管理
    status VARCHAR(50) DEFAULT 'consultation' NOT NULL 
        CHECK (status IN ('consultation', 'hearing', 'doc_prep', 'review', 'submitted', 'accepted', 'rejected')),
    
    progress_rate INTEGER DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
    
    -- 契約ステータス
    contract_status VARCHAR(50) DEFAULT 'negotiating' 
        CHECK (contract_status IN ('negotiating', 'agreed', 'signed')),
    
    -- 金額・期限
    amount VARCHAR(100),           -- 申請金額
    deadline DATE,                 -- 申請締切
    
    -- 担当者
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- 主担当者
    assistant_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- 補助担当者
    
    -- ヒアリングテンプレート（既存hearing_templatesとの連携）
    hearing_template_id BIGINT REFERENCES hearing_templates(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cases IS '補助金申請案件';
COMMENT ON COLUMN cases.id IS '案件ID';
COMMENT ON COLUMN cases.subsidy_id IS '補助金ID';
COMMENT ON COLUMN cases.user_group_id IS '申請者グループID';
COMMENT ON COLUMN cases.expert_group_id IS '専門家グループID';
COMMENT ON COLUMN cases.title IS '案件名';
COMMENT ON COLUMN cases.status IS '進行ステータス（consultation:相談中, hearing:ヒアリング, doc_prep:書類準備, review:審査中, submitted:申請済, accepted:採択, rejected:不採択）';
COMMENT ON COLUMN cases.progress_rate IS '進捗率（0-100）';
COMMENT ON COLUMN cases.contract_status IS '契約ステータス';
COMMENT ON COLUMN cases.amount IS '申請金額';
COMMENT ON COLUMN cases.deadline IS '申請締切日';
COMMENT ON COLUMN cases.assignee_id IS '主担当者ID';
COMMENT ON COLUMN cases.assistant_id IS '補助担当者ID';

-- ==========================================
-- 3. case_steps: 案件の進行段階
-- Next.jsのProgressStep, Stepタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS case_steps (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,        -- 表示順序（1から始まる）
    title VARCHAR(255) NOT NULL,        -- ステップ名
    subtitle VARCHAR(255),              -- サブタイトル
    description TEXT,                   -- 説明
    estimated_days INTEGER,             -- 予想所要日数
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('completed', 'in_progress', 'pending')),
    completed_at TIMESTAMPTZ,           -- 完了日時
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE case_steps IS '案件の進行段階';
COMMENT ON COLUMN case_steps.step_order IS '表示順序';
COMMENT ON COLUMN case_steps.status IS 'ステータス（completed, in_progress, pending）';

-- ==========================================
-- 4. case_members: 案件メンバー
-- Next.jsのMember, TeamMemberタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS case_members (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('applicant', 'introducer', 'member')),
    is_primary BOOLEAN DEFAULT FALSE,   -- 主申請者フラグ
    added_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE case_members IS '案件に参加するメンバー';
COMMENT ON COLUMN case_members.role IS '役割（applicant:申請者, introducer:紹介者, member:メンバー）';
COMMENT ON COLUMN case_members.is_primary IS '主申請者フラグ';

-- ==========================================
-- 5. tasks: タスク
-- Next.jsのTask, ChecklistItemタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- タスクタイプ
    type VARCHAR(50) DEFAULT 'general' NOT NULL 
        CHECK (type IN ('file_upload', 'form_input', 'confirmation', 'general')),
    
    -- 優先度・期限
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    deadline DATE,
    days_remaining INTEGER,             -- 残り日数（計算フィールドまたは手動更新）
    
    -- 担当
    assignee_role VARCHAR(50) CHECK (assignee_role IN ('customer', 'expert', 'assistant')),
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- ステータス
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    
    -- チェックリスト用
    is_required BOOLEAN DEFAULT FALSE,
    link_url VARCHAR(2048),
    
    -- リマインダー
    remind_at TIMESTAMPTZ,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'タスク';
COMMENT ON COLUMN tasks.type IS 'タスクタイプ';
COMMENT ON COLUMN tasks.priority IS '優先度（high, medium, low）';
COMMENT ON COLUMN tasks.status IS 'ステータス（pending, in_progress, review, completed）';

-- ==========================================
-- 6. documents: 書類
-- Next.jsのDocumentタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),         -- 書類種別
    
    -- ファイル情報
    file_name VARCHAR(255),
    file_path VARCHAR(2048),
    file_size VARCHAR(50),              -- 例: "2.5MB"
    version INTEGER DEFAULT 1,
    
    -- ステータス
    status VARCHAR(50) DEFAULT 'not_submitted' NOT NULL 
        CHECK (status IN ('not_submitted', 'submitted', 'reviewing', 'approved', 'rejected')),
    
    -- フラグ
    is_required BOOLEAN DEFAULT FALSE,
    has_template BOOLEAN DEFAULT FALSE,
    template_url VARCHAR(2048),
    
    -- フィードバック
    feedback TEXT,
    
    -- アップロード情報
    uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE documents IS '案件に関連する書類';
COMMENT ON COLUMN documents.status IS 'ステータス（not_submitted, submitted, reviewing, approved, rejected）';

-- ==========================================
-- 7. messages: メッセージ
-- Next.jsのMessageタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    content TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS '案件ごとのチャットメッセージ';

-- ==========================================
-- 8. message_attachments: メッセージ添付ファイル
-- ==========================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(2048) NOT NULL,
    file_size VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE message_attachments IS 'メッセージに添付されたファイル';

-- ==========================================
-- 9. activity_logs: 活動ログ・タイムライン
-- Next.jsのTimelineItem, ActivityHistoryタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- アクション情報
    action_type VARCHAR(100) NOT NULL,  -- 例: 'document_uploaded', 'status_changed', 'message_sent'
    description TEXT,
    
    -- 対象情報
    target_type VARCHAR(100),           -- 例: 'document', 'task', 'case'
    target_id BIGINT,
    target_value VARCHAR(500),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS '案件に関する操作ログ・タイムライン';

-- ==========================================
-- 10. templates: テンプレート
-- Next.jsのTemplate, DocumentTemplate, TaskTemplateタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS templates (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- テンプレートタイプ
    type VARCHAR(50) NOT NULL CHECK (type IN ('message', 'document', 'task')),
    
    -- カテゴリ
    category VARCHAR(100),              -- hearing, document-request, reminder, etc.
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,                       -- メッセージ本文など
    
    -- ドキュメントテンプレート用
    file_path VARCHAR(2048),
    action_type VARCHAR(50),            -- download, link
    action_url VARCHAR(2048),
    
    -- タスクテンプレート用
    priority VARCHAR(20),
    assignee_role VARCHAR(50),
    
    -- 統計
    usage_count INTEGER DEFAULT 0,
    
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE templates IS '専門家が作成するテンプレート（メッセージ、書類、タスク）';

-- ==========================================
-- 11. introducers: 紹介者管理
-- Next.jsのIntroducerタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS introducers (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- 紹介先の専門家
    
    -- 紹介者情報（profilesを持たない外部紹介者の場合）
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),
    industry VARCHAR(100),
    location VARCHAR(255),
    
    -- profilesを持つ紹介者の場合
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE introducers IS '専門家への顧客紹介者';

-- ==========================================
-- 12. referrals: 紹介実績
-- ==========================================
CREATE TABLE IF NOT EXISTS referrals (
    id BIGSERIAL PRIMARY KEY,
    introducer_id BIGINT NOT NULL REFERENCES introducers(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- 紹介された顧客
    case_id BIGINT REFERENCES cases(id) ON DELETE SET NULL,  -- 紹介に関連する案件
    referred_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE referrals IS '紹介実績（紹介者がどの顧客を紹介したか）';

-- ==========================================
-- 13. notifications: 通知
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    type VARCHAR(100) NOT NULL,         -- deadline_reminder, new_case, document_upload, message, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- リンク先
    link_url VARCHAR(2048),
    related_case_id BIGINT REFERENCES cases(id) ON DELETE SET NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'ユーザーへの通知';

-- ==========================================
-- 14. notification_settings: 通知設定
-- Next.jsのNotificationSettingsタイプに対応
-- ==========================================
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    deadline_reminder BOOLEAN DEFAULT TRUE,
    new_case_notification BOOLEAN DEFAULT TRUE,
    document_upload_notification BOOLEAN DEFAULT TRUE,
    message_notification BOOLEAN DEFAULT TRUE,
    system_maintenance BOOLEAN DEFAULT TRUE,
    new_feature_release BOOLEAN DEFAULT TRUE,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notification_settings IS 'ユーザーごとの通知設定';

-- ==========================================
-- 15. expert_subsidy_configs: 専門家別補助金設定
-- ==========================================
CREATE TABLE IF NOT EXISTS expert_subsidy_configs (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    
    -- デフォルトステップ設定
    default_steps JSONB,                -- [{title, subtitle, estimated_days}, ...]
    
    -- デフォルトタスク設定
    default_tasks JSONB,                -- [{title, priority, assignee_role}, ...]
    
    -- ヒアリングテンプレート
    hearing_template_id BIGINT REFERENCES hearing_templates(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(expert_id, subsidy_id)
);

COMMENT ON TABLE expert_subsidy_configs IS '専門家ごとの補助金設定（デフォルトステップ、タスクなど）';

-- ==========================================
-- 16. office_teams: 事務所チーム（既に作成済み）
-- ==========================================
-- expert_id → member_id の関係
-- role: assistant, partner

-- ==========================================
-- インデックス作成
-- ==========================================

-- cases
CREATE INDEX IF NOT EXISTS idx_cases_subsidy_id ON cases(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_group_id ON cases(user_group_id);
CREATE INDEX IF NOT EXISTS idx_cases_expert_group_id ON cases(expert_group_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_assignee_id ON cases(assignee_id);
CREATE INDEX IF NOT EXISTS idx_cases_deadline ON cases(deadline);

-- case_steps
CREATE INDEX IF NOT EXISTS idx_case_steps_case_id ON case_steps(case_id);
CREATE INDEX IF NOT EXISTS idx_case_steps_status ON case_steps(status);

-- case_members
CREATE INDEX IF NOT EXISTS idx_case_members_case_id ON case_members(case_id);
CREATE INDEX IF NOT EXISTS idx_case_members_user_id ON case_members(user_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- message_attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_case_id ON activity_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- templates
CREATE INDEX IF NOT EXISTS idx_templates_expert_id ON templates(expert_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- introducers
CREATE INDEX IF NOT EXISTS idx_introducers_expert_id ON introducers(expert_id);
CREATE INDEX IF NOT EXISTS idx_introducers_user_id ON introducers(user_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_introducer_id ON referrals(introducer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_case_id ON referrals(case_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- expert_subsidy_configs
CREATE INDEX IF NOT EXISTS idx_expert_subsidy_configs_expert_id ON expert_subsidy_configs(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_subsidy_configs_subsidy_id ON expert_subsidy_configs(subsidy_id);

-- ==========================================
-- トリガー関数作成
-- ==========================================

-- 汎用updated_atトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー適用
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_introducers_updated_at ON introducers;
CREATE TRIGGER update_introducers_updated_at
    BEFORE UPDATE ON introducers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expert_subsidy_configs_updated_at ON expert_subsidy_configs;
CREATE TRIGGER update_expert_subsidy_configs_updated_at
    BEFORE UPDATE ON expert_subsidy_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- テーブルコメント
-- ==========================================
COMMENT ON TABLE cases IS '案件テーブル - 補助金申請案件を管理';
COMMENT ON TABLE case_steps IS '案件進行段階 - 案件の進行ステップを管理';
COMMENT ON TABLE case_members IS '案件メンバー - 案件に参加するメンバーを管理';
COMMENT ON TABLE tasks IS 'タスク - 案件に紐づくタスクを管理';
COMMENT ON TABLE documents IS '書類 - 案件に紐づく書類を管理';
COMMENT ON TABLE messages IS 'メッセージ - 案件ごとのチャット履歴';
COMMENT ON TABLE message_attachments IS '添付ファイル - メッセージの添付ファイル';
COMMENT ON TABLE activity_logs IS '活動ログ - 案件のタイムライン';
COMMENT ON TABLE templates IS 'テンプレート - 再利用可能なテンプレート';
COMMENT ON TABLE introducers IS '紹介者 - 顧客を紹介した紹介者';
COMMENT ON TABLE referrals IS '紹介実績 - 紹介者による紹介履歴';
COMMENT ON TABLE notifications IS '通知 - ユーザーへの通知';
COMMENT ON TABLE notification_settings IS '通知設定 - ユーザーの通知設定';
COMMENT ON TABLE expert_subsidy_configs IS '専門家補助金設定 - 専門家ごとの補助金設定';
