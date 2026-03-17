# 補助金検索関数の使用方法

## 概要

`search_subsidies`関数は、補助金を検索してJSON形式で結果を返すPostgreSQL関数です。SupabaseのRPC（Remote Procedure Call）として呼び出すことができます。

## 関数シグネチャ

```sql
search_subsidies(
  search_text TEXT DEFAULT NULL,
  region_name TEXT DEFAULT NULL,
  industry_names TEXT[] DEFAULT NULL,
  institution_names TEXT[] DEFAULT NULL
) RETURNS JSON
```

## パラメータ

| パラメータ | 型 | 説明 | デフォルト |
|-----------|-----|------|----------|
| `search_text` | TEXT | 補助金名の検索テキスト（部分一致、大文字小文字を区別しない） | NULL |
| `region_name` | TEXT | 地域名（「すべて」の場合はNULLまたは'すべて'） | NULL |
| `industry_names` | TEXT[] | 業種名の配列（複数選択可能） | NULL |
| `institution_names` | TEXT[] | 機関名の配列（複数選択可能） | NULL |

## 戻り値

JSON配列形式で補助金情報を返します。各補助金オブジェクトには以下の情報が含まれます：

```json
[
  {
    "id": 1,
    "title": "補助金名",
    "amount_description": "40万円",
    "application_period_start": "2025-01-01",
    "application_period_end": "2025-12-24",
    "subsidy_rate": "2/3",
    "overview": "概要",
    "official_page_url": "https://example.com",
    "status": "公募中",
    "region": {
      "name": "東京都",
      "code": "TOKYO"
    },
    "institution": {
      "name": "経済産業省",
      "code": "MINISTRY_OF_ECONOMY"
    },
    "industries": [
      {
        "id": 1,
        "name": "小売業",
        "code": "RETAIL"
      }
    ],
    "eligible_activities": [
      {
        "id": 1,
        "name": "録音・録画環境の整備",
        "display_order": 1
      }
    ],
    "eligibility_conditions": [
      {
        "id": 1,
        "text": "都内中小企業・個人事業主",
        "display_order": 1
      }
    ],
    "required_documents": [
      {
        "id": 1,
        "name": "事業計画書",
        "display_order": 1
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

## 使用例

### 1. すべての補助金を取得

```sql
SELECT search_subsidies();
```

### 2. 補助金名で検索

```sql
SELECT search_subsidies(search_text := 'カスタマー');
```

### 3. 地域でフィルタリング

```sql
SELECT search_subsidies(region_name := '東京都');
```

### 4. 業種でフィルタリング（複数選択）

```sql
SELECT search_subsidies(industry_names := ARRAY['小売業', 'サービス業']);
```

### 5. 機関でフィルタリング（複数選択）

```sql
SELECT search_subsidies(institution_names := ARRAY['経済産業省', '中小企業庁']);
```

### 6. 複数条件で検索

```sql
SELECT search_subsidies(
  search_text := 'カスタマー',
  region_name := '東京都',
  industry_names := ARRAY['小売業', 'サービス業'],
  institution_names := ARRAY['経済産業省']
);
```

## Supabaseクライアントからの呼び出し

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 補助金を検索
const { data, error } = await supabase.rpc('search_subsidies', {
  search_text: 'カスタマー',
  region_name: '東京都',
  industry_names: ['小売業', 'サービス業'],
  institution_names: ['経済産業省']
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Results:', data);
}
```

### Next.js API Route例

```typescript
// app/api/subsidies/search/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const searchText = searchParams.get('search_text') || null;
  const regionName = searchParams.get('region_name') || null;
  const industryNames = searchParams.get('industry_names')?.split(',') || null;
  const institutionNames = searchParams.get('institution_names')?.split(',') || null;

  const { data, error } = await supabase.rpc('search_subsidies', {
    search_text: searchText,
    region_name: regionName,
    industry_names: industryNames,
    institution_names: institutionNames,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

## 注意事項

1. **地域フィルタ**: `region_name`が「すべて」またはNULLの場合は、すべての地域が対象になります。

2. **金額フィルタ**: 現在の実装では金額フィルタは含まれていません。必要に応じて追加できます。

3. **パフォーマンス**: 大量のデータがある場合は、インデックスが適切に設定されていることを確認してください。

4. **権限**: SupabaseでRPC関数を呼び出すには、適切な権限が必要です。`anon`ロールに実行権限を付与する必要があります。

## 権限設定

Supabaseで関数を公開するには、以下のSQLを実行してください：

```sql
-- anonロールに実行権限を付与
-- `search_subsidies`関数の実行権限を匿名ユーザー（anon）に付与します。
-- これにより、未ログインのユーザー（認証なし）でもSupabase RPC経由で検索関数を利用できます。
GRANT EXECUTE ON FUNCTION search_subsidies TO anon;

-- `search_subsidies`関数の実行権限を認証済みユーザー（authenticated）にも付与します。
-- ログイン済みのユーザーも同じく検索が可能です。
-- ログインしていないユーザー（anon）もsearch_subsidies関数を利用できます。
GRANT EXECUTE ON FUNCTION search_subsidies TO anon;

-- ログイン済みユーザー（authenticated）も同様に利用できます。
GRANT EXECUTE ON FUNCTION search_subsidies TO authenticated;
```
