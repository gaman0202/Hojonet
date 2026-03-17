# 補助金テーブル設計書

## 概要

補助金情報を管理するためのデータベーステーブル構造です。既存のマスタテーブル（`m_regions`、`m_institutions`、`m_industries`）と連携して使用します。

## テーブル構成

### 1. subsidies（補助金メインテーブル）

補助金の基本情報を格納するメインテーブルです。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PRIMARY KEY | 補助金ID（主キー） |
| title | VARCHAR(500) | NOT NULL | 補助金名 |
| implementing_organization_id | BIGINT | FOREIGN KEY → m_institutions | 実施機関ID（m_institutionsへの外部キー） |
| region_id | BIGINT | FOREIGN KEY → m_regions | 地域ID（m_regionsへの外部キー） |
| amount_min | NUMERIC(12, 2) | | 補助金額（最小値、単位：円） |
| amount_max | NUMERIC(12, 2) | | 補助金額（最大値、単位：円） |
| amount_description | VARCHAR(200) | | 補助金額の説明（例：「40万円」「最大200万円」） |
| application_period_start | DATE | | 申請期間開始日 |
| application_period_end | DATE | | 申請期間終了日 |
| subsidy_rate | VARCHAR(50) | | 補助率（文字列形式：例「2/3」） |
| purpose | TEXT | | 目的 |
| official_page_url | TEXT | | 公式公募ページURL |
| overview | TEXT | | 概要 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**補助金額について:**
- `amount_min`: 最小金額を数値（円単位）で格納
- `amount_max`: 最大金額を数値（円単位）で格納
- `amount_description`: 表示用の説明文（例：「40万円」「最大200万円」）
- 金額の範囲検索やソートが可能になります

**外部キー関係:**
- `implementing_organization_id` → `m_institutions.id`
- `region_id` → `m_regions.id`

**ステータス計算:**
- `status`カラムは存在せず、`get_subsidy_status()`関数で動的に計算されます
- ステータスは申請期間の開始日・終了日と現在日時を比較して自動判定されます
- ステータスの種類：
  - `未開始`: 開始日が設定されており、現在日時が開始日前
  - `公募中`: 申請期間内で、終了日まで7日以上ある
  - `締切間近`: 申請期間内で、終了日まで7日以内
  - `終了`: 終了日を過ぎている
- 通常は`subsidies_with_status`ビューを使用してステータスを含む補助金情報を取得します

### 2. industries（補助金と業種の中間テーブル）

補助金と業種の多対多関係を管理する中間テーブルです。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PRIMARY KEY | ID（主キー） |
| subsidy_id | BIGINT | NOT NULL, FOREIGN KEY → subsidies | 補助金ID（subsidiesへの外部キー） |
| industry_id | BIGINT | NOT NULL, FOREIGN KEY → m_industries | 業種ID（m_industriesへの外部キー） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**制約:**
- `(subsidy_id, industry_id)` のユニーク制約（同じ補助金に同じ業種を重複登録できない）

**外部キー関係:**
- `subsidy_id` → `subsidies.id` (CASCADE DELETE)
- `industry_id` → `m_industries.id` (CASCADE DELETE)

### 3. eligible_activities（対象となる取組テーブル）

補助金の対象となる取組を格納するテーブルです。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PRIMARY KEY | ID（主キー） |
| subsidy_id | BIGINT | NOT NULL, FOREIGN KEY → subsidies | 補助金ID（subsidiesへの外部キー） |
| activity_name | VARCHAR(500) | NOT NULL | 取組名 |
| display_order | INTEGER | DEFAULT 0 | 表示順序 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**外部キー関係:**
- `subsidy_id` → `subsidies.id` (CASCADE DELETE)

### 4. eligibility_conditions（対象条件テーブル）

補助金の対象条件を格納するテーブルです。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PRIMARY KEY | ID（主キー） |
| subsidy_id | BIGINT | NOT NULL, FOREIGN KEY → subsidies | 補助金ID（subsidiesへの外部キー） |
| condition_text | TEXT | NOT NULL | 条件テキスト |
| display_order | INTEGER | DEFAULT 0 | 表示順序 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**外部キー関係:**
- `subsidy_id` → `subsidies.id` (CASCADE DELETE)

### 5. required_documents（必要書類テーブル）

補助金の必要書類を格納するテーブルです。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PRIMARY KEY | ID（主キー） |
| subsidy_id | BIGINT | NOT NULL, FOREIGN KEY → subsidies | 補助金ID（subsidiesへの外部キー） |
| document_name | VARCHAR(500) | NOT NULL | 書類名 |
| display_order | INTEGER | DEFAULT 0 | 表示順序 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**外部キー関係:**
- `subsidy_id` → `subsidies.id` (CASCADE DELETE)

## テーブル関係図

```
m_regions (地域マスタ)
    ↑
    │ region_id
    │
subsidies (補助金メインテーブル)
    │
    ├─→ industries (中間テーブル) → m_industries (業種マスタ)
    │
    ├─→ eligible_activities (対象となる取組)
    │
    ├─→ eligibility_conditions (対象条件)
    │
    └─→ required_documents (必要書類)

m_institutions (機関マスタ)
    ↑
    │ implementing_organization_id
    │
subsidies
```

## 関数とビュー

### get_subsidy_status() 関数

申請期間の開始日・終了日と現在日時を比較して、補助金のステータスを自動計算する関数です。

**パラメータ:**
- `period_start DATE`: 申請期間開始日
- `period_end DATE`: 申請期間終了日

**戻り値:**
- `VARCHAR(50)`: ステータス（「未開始」「公募中」「締切間近」「終了」）

**ロジック:**
1. 終了日がNULLの場合はNULLを返す
2. 現在日時が終了日を過ぎている場合 → `終了`
3. 開始日が設定されており、現在日時が開始日前の場合 → `未開始`
4. 終了日まで7日以内の場合 → `締切間近`
5. それ以外 → `公募中`

### subsidies_with_status ビュー

補助金情報にステータスを含むビューです。通常はこのビューを使用して補助金情報を取得します。

```sql
SELECT * FROM subsidies_with_status;
```

このビューには、`subsidies`テーブルのすべてのカラムに加えて、計算された`status`カラムが含まれます。

## インデックス

以下のインデックスが作成されます：

- `subsidies.implementing_organization_id` - 実施機関での検索
- `subsidies.region_id` - 地域での検索
- `subsidies.application_period_end` - 申請期間終了日での検索・ソート
- `industries` - 補助金ID、業種IDでの検索
- 各関連テーブルの `subsidy_id` - 補助金IDでの検索

## データ例

### subsidies テーブル
```sql
INSERT INTO subsidies (
  title,
  implementing_organization_id,
  region_id,
  amount_min,
  amount_max,
  amount_description,
  application_period_start,
  application_period_end,
  subsidy_rate,
  purpose,
  official_page_url,
  overview
) VALUES (
  '令和7年度カスタマーハラスメント防止対策推進事業_企業向け奨励金第3回募集要項',
  (SELECT id FROM m_institutions WHERE name = '東京都'),
  (SELECT id FROM m_regions WHERE name = '東京都'),
  400000,  -- 40万円
  400000,  -- 40万円（固定額の場合）
  '40万円',
  '2025-01-01',
  '2025-12-24',
  '2/3',
  '構成員相互の親睦、連絡及び意見交換等',
  'https://example.com',
  '市内空き店舗の活用及び、新しいビジネスに挑戦する創業者の育成支援を図り、商店街活性化の促進につなげる「チャレンジショップ」を支援します。 ※事前相談を行う必要があります。'
);
```

### ステータスを含む補助金情報の取得
```sql
-- ビューを使用してステータスを含む補助金情報を取得
SELECT * FROM subsidies_with_status WHERE id = 1;

-- または、関数を直接使用
SELECT 
  *,
  get_subsidy_status(application_period_start, application_period_end) AS status
FROM subsidies
WHERE id = 1;
```

### industries テーブル
```sql
INSERT INTO industries (subsidy_id, industry_id)
VALUES
  (1, (SELECT id FROM m_industries WHERE name = '小売業')),
  (1, (SELECT id FROM m_industries WHERE name = 'サービス業'));
```

### eligible_activities テーブル
```sql
INSERT INTO eligible_activities (subsidy_id, activity_name, display_order)
VALUES
  (1, '録音・録画環境の整備', 1),
  (1, 'AIを活用したシステム等の導入', 2),
  (1, '外部人材の活用', 3);
```

## 注意事項

1. **ステータスの自動計算**: `status`カラムは存在せず、`get_subsidy_status()`関数または`subsidies_with_status`ビューを使用して取得します。ステータスは申請期間と現在日時を比較して自動的に計算されます。

2. **締切間近の定義**: 終了日まで7日以内を「締切間近」としています。この期間は変更可能です（関数内の`days_until_end <= 7`の部分を変更）。

3. **CASCADE DELETE**: 補助金を削除すると、関連するすべてのデータ（対象取組、対象条件、必要書類、業種関連）も自動的に削除されます。

4. **マスタテーブルとの連携**: 実施機関と地域はマスタテーブルを参照するため、マスタテーブルに存在するIDのみ使用できます。

5. **業種の多対多関係**: 1つの補助金に複数の業種を関連付けることができます。

6. **表示順序**: 対象取組、対象条件、必要書類には `display_order` カラムがあり、表示順序を制御できます。

7. **ビューの使用**: 通常は`subsidies_with_status`ビューを使用して補助金情報を取得することを推奨します。これにより、ステータスが自動的に計算されます。
