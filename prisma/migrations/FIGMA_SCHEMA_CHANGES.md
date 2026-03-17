# Figmaデザインに基づくDBスキーマ変更

## 概要

このドキュメントは、Figmaデザインの分析結果に基づいて実施したデータベーススキーマの拡張・改善内容を説明します。

## 変更対象ファイル

- `enhance_schema_from_figma.sql`

## 分析したFigma画面

| 画面名 | 主要な機能 |
|--------|-----------|
| ダッシュボード | 進行中案件、緊急タスク、重要なお知らせ |
| 案件管理 | 補助金カード一覧、案件数統計 |
| 案件詳細 | 補助金詳細情報、専門家情報 |
| 進行中案件詳細 | 申請フロー、タスク、書類管理、メッセージ、メンバーリスト |
| 顧客管理 | 顧客一覧、顧客詳細、メモ、活動履歴 |
| 紹介者管理 | 紹介者一覧、紹介顧客リスト |
| テンプレート管理 | メッセージ、書類、タスクテンプレート |
| 設定 | プロフィール、通知設定、チーム管理、セキュリティ |
| マイページ | ユーザー統計、プロフィール |

## 主要な変更内容

### 1. ENUM型の追加

```sql
-- タスクテンプレートカテゴリ
task_template_category: hearing, document, meeting, confirmation, application, report, preparation

-- 書類テンプレートカテゴリ  
document_template_category: subsidy_application, business_plan, financial, external_system, reference

-- 書類審査ステータス
document_review_status: not_submitted, submitted, reviewing, approved, rejected
```

### 2. テーブル拡張

#### templates テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| task_category | ENUM | タスクテンプレートカテゴリ |
| document_category | ENUM | 書類テンプレートカテゴリ |
| default_assignee_role | VARCHAR | デフォルト担当役割 |
| default_priority | VARCHAR | デフォルト優先度 |
| related_document_types | JSONB | 関連書類タイプ |

#### tasks テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| category | ENUM | タスクカテゴリ |
| linked_document_id | BIGINT | 関連書類ID |
| template_id | BIGINT | 元テンプレートID |
| display_order | INTEGER | 表示順序 |

#### documents テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| template_id | BIGINT | 元テンプレートID |
| expert_comment | TEXT | 専門家コメント |
| comment_at | TIMESTAMPTZ | コメント日時 |
| commenter_id | UUID | コメント者ID |
| category | ENUM | 書類カテゴリ |

#### cases テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| needs_attention | BOOLEAN | 対応必要フラグ |
| unread_message_count | INTEGER | 未読メッセージ数 |
| pending_task_count | INTEGER | 未完了タスク数 |
| urgent_task_count | INTEGER | 緊急タスク数 |
| last_activity_at | TIMESTAMPTZ | 最終活動日時 |

#### profiles テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| stats_total_applications | INTEGER | 申請総数 |
| stats_active_cases | INTEGER | 進行中案件数 |
| stats_accepted_cases | INTEGER | 採択済み案件数 |
| stats_acceptance_rate | DECIMAL | 採択率 |
| last_login_at | TIMESTAMPTZ | 最終ログイン |

### 3. 新規テーブル

#### message_read_status（メッセージ既読状態）
```sql
- message_id: メッセージID
- user_id: 読んだユーザーID
- read_at: 既読日時
```

#### customer_notes（顧客メモ）
```sql
- expert_id: メモを書いた専門家
- customer_id: 対象顧客
- content: メモ内容
```

#### expert_customers（専門家-顧客関係）
```sql
- expert_id: 専門家ID
- customer_id: 顧客ID
- introducer_id: 紹介者ID
- total_cases: 総案件数
- active_cases: 進行中案件数
- completed_cases: 完了案件数
- review_cases: 審査中案件数
```

#### application_flow_templates（申請フローテンプレート）
```sql
- expert_id: 専門家ID
- subsidy_id: 補助金ID
- name: テンプレート名
- is_default: デフォルトフラグ
```

#### application_flow_steps（申請フローステップ）
```sql
- flow_template_id: フローテンプレートID
- step_order: 順序
- title: ステップ名
- subtitle: サブタイトル
- description: 詳細説明
- estimated_days: 目安日数
```

#### global_activity_logs（グローバル操作履歴）
```sql
- user_id: ユーザーID
- action_type: 操作種別
- action_description: 操作説明
- target_type: 対象種類
- target_id: 対象ID
- ip_address: IPアドレス
- user_agent: ユーザーエージェント
```

### 4. ビュー

| ビュー名 | 説明 |
|----------|------|
| dashboard_cases_summary | ダッシュボード用案件サマリー |
| customer_list_view | 顧客管理一覧用 |
| active_cases_view | 進行中案件一覧用 |

### 5. 関数

| 関数名 | 説明 |
|--------|------|
| calculate_case_progress | 案件の進捗率を計算 |
| update_case_statistics | 案件の統計情報を更新 |
| update_customer_statistics | 顧客の統計情報を更新 |

### 6. トリガー

| トリガー名 | 説明 |
|------------|------|
| update_case_stats_on_task_change | タスク変更時に案件統計を自動更新 |

## 画面とテーブルの対応

```
ダッシュボード
└── cases (needs_attention, unread_message_count, pending_task_count, urgent_task_count)
└── dashboard_cases_summary ビュー

案件管理
└── cases
└── subsidies

進行中案件詳細_申請フロー
└── case_steps
└── application_flow_templates / application_flow_steps

進行中案件詳細_タスク
└── tasks (category, linked_document_id, template_id, display_order)

進行中案件詳細_書類管理
└── documents (template_id, expert_comment, comment_at, commenter_id, category)

進行中案件詳細_メッセージ
└── messages
└── message_read_status

進行中案件詳細_メンバーリスト
└── case_members

顧客管理
└── profiles
└── expert_customers
└── customer_notes
└── customer_list_view ビュー

紹介者管理
└── introducers (industry_type, total_referrals, status)
└── referrals

テンプレート管理_タスク
└── templates (task_category, default_assignee_role, default_priority)

テンプレート管理_書類
└── templates (document_category, action_type, action_url)

マイページ
└── profiles (stats_total_applications, stats_active_cases, stats_accepted_cases, stats_acceptance_rate)

設定_通知設定
└── notification_settings (line_notification, email_notification, notification_frequency)

操作履歴
└── global_activity_logs
```

## 適用方法

1. Supabase SQLエディタで `enhance_schema_from_figma.sql` を実行
2. `npx prisma db pull` でスキーマを同期
3. `npx prisma generate` でクライアントを再生成

## 注意事項

- RLSは開発用に無効化されています。本番環境では適切なポリシーを設定してください。
- キャッシュカラム（統計情報など）は定期的な更新が必要です。
- ENUMの値は日本語UIとの対応を考慮して英語で定義しています。
