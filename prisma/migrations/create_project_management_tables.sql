-- ==========================================
-- プロジェクト管理関連テーブルのマイグレーション
-- 既存テーブルへの影響を最小限に抑えた設計
-- ==========================================

-- ==========================================
-- 1. profiles テーブルに新しいカラム追加
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS furigana VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS icon_url VARCHAR(2048);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_detail VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS annual_sales BIGINT;

COMMENT ON COLUMN profiles.furigana IS 'ふりがな';
COMMENT ON COLUMN profiles.line_id IS 'LINE連携ID';
COMMENT ON COLUMN profiles.icon_url IS 'プロフィール画像URL';
COMMENT ON COLUMN profiles.is_active IS 'アカウント有効ステータス';
COMMENT ON COLUMN profiles.address_detail IS '所在地詳細';
COMMENT ON COLUMN profiles.annual_sales IS '年商';

-- ==========================================
-- 2. expert_profiles: 専門家プロフィール
-- ==========================================
CREATE TABLE IF NOT EXISTS expert_profiles (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    office_name VARCHAR(255),
    office_address VARCHAR(255),
    registration_number VARCHAR(100),
    association VARCHAR(100),
    registration_year INTEGER,
    specialties JSONB,
    one_line_message VARCHAR(255),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE expert_profiles IS '専門家（行政書士）の事務所情報';
COMMENT ON COLUMN expert_profiles.user_id IS 'ユーザーID';
COMMENT ON COLUMN expert_profiles.office_name IS '事務所名';
COMMENT ON COLUMN expert_profiles.office_address IS '事務所所在地';
COMMENT ON COLUMN expert_profiles.registration_number IS '登録番号';
COMMENT ON COLUMN expert_profiles.association IS '所属会';
COMMENT ON COLUMN expert_profiles.registration_year IS '登録年度';
COMMENT ON COLUMN expert_profiles.specialties IS '専門分野';
COMMENT ON COLUMN expert_profiles.one_line_message IS '一言メッセージ';
COMMENT ON COLUMN expert_profiles.memo IS 'メモ';

CREATE OR REPLACE FUNCTION update_expert_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expert_profiles_updated_at ON expert_profiles;
CREATE TRIGGER update_expert_profiles_updated_at
  BEFORE UPDATE ON expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_profiles_updated_at();

-- ==========================================
-- 3. office_teams: 事務所チーム管理
-- ==========================================
CREATE TABLE IF NOT EXISTS office_teams (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('assistant', 'partner')),
    status VARCHAR(50) DEFAULT 'invited' NOT NULL CHECK (status IN ('invited', 'active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE office_teams IS '専門家とアシスタントの所属関係';
COMMENT ON COLUMN office_teams.id IS 'チームメンバーID';
COMMENT ON COLUMN office_teams.expert_id IS '専門家ID';
COMMENT ON COLUMN office_teams.member_id IS 'メンバーID';
COMMENT ON COLUMN office_teams.role IS 'チーム内役割';
COMMENT ON COLUMN office_teams.status IS 'ステータス';

CREATE OR REPLACE FUNCTION update_office_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_office_teams_updated_at ON office_teams;
CREATE TRIGGER update_office_teams_updated_at
  BEFORE UPDATE ON office_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_office_teams_updated_at();

CREATE INDEX IF NOT EXISTS idx_office_teams_expert_id ON office_teams(expert_id);
CREATE INDEX IF NOT EXISTS idx_office_teams_member_id ON office_teams(member_id);

-- ==========================================
-- 4. templates: テンプレート管理
-- ==========================================
CREATE TABLE IF NOT EXISTS templates (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('message', 'document', 'task', 'hearing')),
    title VARCHAR(255) NOT NULL,
    content_text TEXT,
    content_file_path VARCHAR(2048),
    content_type VARCHAR(50) DEFAULT 'text' NOT NULL CHECK (content_type IN ('text', 'file', 'link', 'form')),
    tags JSONB,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE templates IS '専門家が作成する再利用可能なテンプレート';
COMMENT ON COLUMN templates.id IS 'テンプレートID';
COMMENT ON COLUMN templates.expert_id IS '専門家ID';
COMMENT ON COLUMN templates.category IS 'カテゴリ';
COMMENT ON COLUMN templates.title IS 'テンプレート名';
COMMENT ON COLUMN templates.content_text IS '本文内容';
COMMENT ON COLUMN templates.content_file_path IS 'ファイルパス';
COMMENT ON COLUMN templates.content_type IS 'コンテンツタイプ';
COMMENT ON COLUMN templates.tags IS 'タグ';
COMMENT ON COLUMN templates.usage_count IS '使用回数';

CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

CREATE INDEX IF NOT EXISTS idx_templates_expert_id ON templates(expert_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- ==========================================
-- 5. expert_subsidy_configs: 専門家別案件設定
-- ==========================================
CREATE TABLE IF NOT EXISTS expert_subsidy_configs (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    phases_config JSONB,
    default_task_template_ids JSONB,
    hearing_template_id BIGINT REFERENCES templates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(expert_id, subsidy_id)
);

COMMENT ON TABLE expert_subsidy_configs IS '専門家ごとの補助金案件進行設定';
COMMENT ON COLUMN expert_subsidy_configs.id IS '設定ID';
COMMENT ON COLUMN expert_subsidy_configs.expert_id IS '専門家ID';
COMMENT ON COLUMN expert_subsidy_configs.subsidy_id IS '補助金ID';
COMMENT ON COLUMN expert_subsidy_configs.phases_config IS '進行段階設定';
COMMENT ON COLUMN expert_subsidy_configs.default_task_template_ids IS 'デフォルトタスクIDリスト';
COMMENT ON COLUMN expert_subsidy_configs.hearing_template_id IS 'ヒアリングテンプレートID';

CREATE OR REPLACE FUNCTION update_expert_subsidy_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expert_subsidy_configs_updated_at ON expert_subsidy_configs;
CREATE TRIGGER update_expert_subsidy_configs_updated_at
  BEFORE UPDATE ON expert_subsidy_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_subsidy_configs_updated_at();

CREATE INDEX IF NOT EXISTS idx_expert_subsidy_configs_expert_id ON expert_subsidy_configs(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_subsidy_configs_subsidy_id ON expert_subsidy_configs(subsidy_id);

-- ==========================================
-- 6. projects: 案件テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'consultation' NOT NULL CHECK (status IN ('consultation', 'hearing', 'doc_prep', 'review', 'application', 'accepted', 'rejected')),
    progress_rate INTEGER DEFAULT 0,
    contract_status VARCHAR(50) DEFAULT 'negotiating' NOT NULL CHECK (contract_status IN ('negotiating', 'agreed', 'signed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE projects IS '進行中の申請案件';
COMMENT ON COLUMN projects.id IS '案件ID';
COMMENT ON COLUMN projects.user_id IS 'ユーザーID';
COMMENT ON COLUMN projects.expert_id IS '専門家ID';
COMMENT ON COLUMN projects.subsidy_id IS '補助金ID';
COMMENT ON COLUMN projects.title IS '案件名';
COMMENT ON COLUMN projects.status IS '進行ステータス';
COMMENT ON COLUMN projects.progress_rate IS '進捗率';
COMMENT ON COLUMN projects.contract_status IS '契約ステータス';

CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_expert_id ON projects(expert_id);
CREATE INDEX IF NOT EXISTS idx_projects_subsidy_id ON projects(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ==========================================
-- 7. project_members: 案件メンバー
-- ==========================================
CREATE TABLE IF NOT EXISTS project_members (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('applicant', 'referrer', 'member')),
    is_team_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_members IS '案件に関わる追加メンバー';
COMMENT ON COLUMN project_members.id IS '案件メンバーID';
COMMENT ON COLUMN project_members.project_id IS '案件ID';
COMMENT ON COLUMN project_members.user_id IS 'ユーザーID';
COMMENT ON COLUMN project_members.role IS '役割';
COMMENT ON COLUMN project_members.is_team_leader IS 'チームリーダーフラグ';

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- ==========================================
-- 8. project_hearing_responses: ヒアリング回答
-- ==========================================
CREATE TABLE IF NOT EXISTS project_hearing_responses (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    question_text TEXT,
    answer_text TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_hearing_responses IS 'チャット/フォームでの初期ヒアリング内容（プロジェクトベース）';
COMMENT ON COLUMN project_hearing_responses.id IS '回答ID';
COMMENT ON COLUMN project_hearing_responses.project_id IS '案件ID';
COMMENT ON COLUMN project_hearing_responses.question_text IS '質問内容';
COMMENT ON COLUMN project_hearing_responses.answer_text IS '回答内容';
COMMENT ON COLUMN project_hearing_responses.responded_at IS '回答日時';

CREATE INDEX IF NOT EXISTS idx_project_hearing_responses_project_id ON project_hearing_responses(project_id);

-- ==========================================
-- 9. tasks: タスクテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('file_upload', 'form_input', 'confirmation')),
    deadline DATE,
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    assignee_role VARCHAR(50) NOT NULL CHECK (assignee_role IN ('user', 'expert', 'assistant')),
    assignee_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'not_started' NOT NULL CHECK (status IN ('not_started', 'in_progress', 'review', 'completed')),
    is_remind_on BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'ユーザーまたは専門家の作業タスク';
COMMENT ON COLUMN tasks.id IS 'タスクID';
COMMENT ON COLUMN tasks.project_id IS '案件ID';
COMMENT ON COLUMN tasks.title IS 'タスク名';
COMMENT ON COLUMN tasks.description IS '詳細説明';
COMMENT ON COLUMN tasks.type IS 'タスク種別';
COMMENT ON COLUMN tasks.deadline IS '期限日';
COMMENT ON COLUMN tasks.priority IS '優先度';
COMMENT ON COLUMN tasks.assignee_role IS '担当役割';
COMMENT ON COLUMN tasks.assignee_user_id IS '担当ユーザーID';
COMMENT ON COLUMN tasks.status IS 'ステータス';
COMMENT ON COLUMN tasks.is_remind_on IS 'リマインド設定';

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user_id ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

-- ==========================================
-- 10. documents: ドキュメント管理
-- ==========================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    document_type VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(2048) NOT NULL,
    version INTEGER DEFAULT 1,
    uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'unsubmitted' NOT NULL CHECK (status IN ('unsubmitted', 'submitted', 'reviewing', 'approved', 'rejected')),
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'アップロード書類とその審査状況';
COMMENT ON COLUMN documents.id IS '書類ID';
COMMENT ON COLUMN documents.project_id IS '案件ID';
COMMENT ON COLUMN documents.task_id IS 'タスクID';
COMMENT ON COLUMN documents.document_type IS '書類種別';
COMMENT ON COLUMN documents.file_name IS 'ファイル名';
COMMENT ON COLUMN documents.file_path IS 'ファイルパス';
COMMENT ON COLUMN documents.version IS 'バージョン';
COMMENT ON COLUMN documents.uploader_id IS 'アップロード者ID';
COMMENT ON COLUMN documents.status IS '審査ステータス';
COMMENT ON COLUMN documents.rejection_reason IS '差戻し理由';

CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ==========================================
-- 11. task_form_definitions: フォーム定義
-- ==========================================
CREATE TABLE IF NOT EXISTS task_form_definitions (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    input_type VARCHAR(50) NOT NULL CHECK (input_type IN ('text', 'number', 'radio', 'checkbox')),
    options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0
);

COMMENT ON TABLE task_form_definitions IS 'タスクタイプがform_inputの場合の質問定義';
COMMENT ON COLUMN task_form_definitions.id IS '定義ID';
COMMENT ON COLUMN task_form_definitions.task_id IS 'タスクID';
COMMENT ON COLUMN task_form_definitions.question_text IS '質問文';
COMMENT ON COLUMN task_form_definitions.input_type IS '入力タイプ';
COMMENT ON COLUMN task_form_definitions.options IS '選択肢';
COMMENT ON COLUMN task_form_definitions.is_required IS '必須フラグ';
COMMENT ON COLUMN task_form_definitions.display_order IS '表示順';

CREATE INDEX IF NOT EXISTS idx_task_form_definitions_task_id ON task_form_definitions(task_id);

-- ==========================================
-- 12. task_form_responses: フォーム回答
-- ==========================================
CREATE TABLE IF NOT EXISTS task_form_responses (
    id BIGSERIAL PRIMARY KEY,
    definition_id BIGINT NOT NULL REFERENCES task_form_definitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    answer_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE task_form_responses IS 'タスクフォームへの回答';
COMMENT ON COLUMN task_form_responses.id IS '回答ID';
COMMENT ON COLUMN task_form_responses.definition_id IS '定義ID';
COMMENT ON COLUMN task_form_responses.user_id IS 'ユーザーID';
COMMENT ON COLUMN task_form_responses.answer_value IS '回答値';

CREATE INDEX IF NOT EXISTS idx_task_form_responses_definition_id ON task_form_responses(definition_id);
CREATE INDEX IF NOT EXISTS idx_task_form_responses_user_id ON task_form_responses(user_id);

-- ==========================================
-- 13. messages: メッセージ
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT,
    is_system_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS '案件ごとのチャット履歴';
COMMENT ON COLUMN messages.id IS 'メッセージID';
COMMENT ON COLUMN messages.project_id IS '案件ID';
COMMENT ON COLUMN messages.sender_id IS '送信者ID';
COMMENT ON COLUMN messages.content IS 'メッセージ内容';
COMMENT ON COLUMN messages.is_system_message IS 'システムメッセージフラグ';

CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ==========================================
-- 14. message_attachments: メッセージ添付ファイル
-- ==========================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(2048) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE message_attachments IS 'メッセージに添付されたファイル';
COMMENT ON COLUMN message_attachments.id IS '添付ID';
COMMENT ON COLUMN message_attachments.message_id IS 'メッセージID';
COMMENT ON COLUMN message_attachments.file_name IS 'ファイル名';
COMMENT ON COLUMN message_attachments.file_path IS 'ファイルパス';

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- ==========================================
-- 15. activity_logs: 操作履歴・タイムライン
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    target_object VARCHAR(255),
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS '案件に関する操作ログ';
COMMENT ON COLUMN activity_logs.id IS 'ログID';
COMMENT ON COLUMN activity_logs.project_id IS '案件ID';
COMMENT ON COLUMN activity_logs.actor_id IS '操作者ID';
COMMENT ON COLUMN activity_logs.action_type IS '操作種別';
COMMENT ON COLUMN activity_logs.target_object IS '対象オブジェクト';
COMMENT ON COLUMN activity_logs.detail IS '詳細';

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ==========================================
-- 16. notifications: 通知
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link_url VARCHAR(2048),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'ユーザーへの通知';
COMMENT ON COLUMN notifications.id IS '通知ID';
COMMENT ON COLUMN notifications.user_id IS 'ユーザーID';
COMMENT ON COLUMN notifications.type IS '通知タイプ';
COMMENT ON COLUMN notifications.title IS 'タイトル';
COMMENT ON COLUMN notifications.message IS 'メッセージ';
COMMENT ON COLUMN notifications.link_url IS 'リンクURL';
COMMENT ON COLUMN notifications.is_read IS '既読フラグ';

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ==========================================
-- 17. referrals: 紹介管理
-- ==========================================
CREATE TABLE IF NOT EXISTS referrals (
    id BIGSERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE referrals IS '専門家への顧客紹介関係';
COMMENT ON COLUMN referrals.id IS '紹介ID';
COMMENT ON COLUMN referrals.expert_id IS '専門家ID';
COMMENT ON COLUMN referrals.referrer_id IS '紹介者ID';
COMMENT ON COLUMN referrals.referred_user_id IS '紹介されたユーザーID';

CREATE INDEX IF NOT EXISTS idx_referrals_expert_id ON referrals(expert_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
