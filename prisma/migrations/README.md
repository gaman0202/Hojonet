# マスタテーブル作成手順

このディレクトリには、マスタテーブルを作成するSQLファイルが含まれています。

## 実行順序

以下の順序でSQLファイルを実行してください：

1. `create_m_regions_master.sql` - 地域マスタ
2. `create_m_institutions_master.sql` - 機関マスタ
3. `create_m_industries_master.sql` - 業種マスタ

## 実行方法

### 方法1: npmスクリプト（最も簡単・推奨）

package.jsonにスクリプトを追加済みです。以下のコマンドで実行できます：

```bash
# すべてのマスタテーブルを一括実行
npm run db:execute:masters

# または個別に実行
npm run db:execute:regions      # 地域マスタのみ
npm run db:execute:institutions # 機関マスタのみ
npm run db:execute:industries   # 業種マスタのみ
```

**注意**: `DATABASE_URL`環境変数が設定されている必要があります。

### 方法1-2: Prismaコマンド（直接実行）

Prismaの`db execute`コマンドを直接使用することもできます：

```bash
# 各SQLファイルを順番に実行
npx prisma db execute --file prisma/migrations/create_m_regions_master.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/migrations/create_m_institutions_master.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/migrations/create_m_industries_master.sql --schema prisma/schema.prisma
```

または、一括実行：

```bash
# すべてのSQLファイルを順番に実行
for file in prisma/migrations/create_*_master.sql; do
  echo "Executing $file..."
  npx prisma db execute --file "$file" --schema prisma/schema.prisma
done
```

### 方法2: Supabase SQL Editor

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を開く
4. 各SQLファイルの内容をコピーして実行

### 方法3: psqlコマンド

```bash
# 環境変数から接続情報を取得
# DATABASE_URLが設定されている場合
psql $DATABASE_URL -f prisma/migrations/create_m_regions_master.sql
psql $DATABASE_URL -f prisma/migrations/create_m_institutions_master.sql
psql $DATABASE_URL -f prisma/migrations/create_m_industries_master.sql

# または、Supabaseの接続情報を直接指定
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f prisma/migrations/create_m_regions_master.sql
```

### 方法4: 一括実行スクリプト（psql）

```bash
# すべてのSQLファイルを順番に実行
for file in prisma/migrations/create_*_master.sql; do
  echo "Executing $file..."
  psql $DATABASE_URL -f "$file"
done
```

## 注意事項

- RLS（Row Level Security）が有効になっているため、マスタテーブルは読み取り専用です
- 更新・削除・新規追加はできません
- データの参照のみ可能です
