# 管理者ユーザー作成ガイド

## 概要

このドキュメントでは、Supabase Admin APIを使用してメール認証不要で管理者ユーザーを作成する方法を説明します。

## 前提条件

- Supabaseプロジェクトが設定されていること
- Supabase Service Role Keyを取得していること

## 環境変数の設定

### 1. Service Role Keyの取得

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. 左メニューから「Settings」→「API」を開く
4. 「service_role」セクションの「secret」キーをコピー
   - ⚠️ **重要**: このキーは機密情報です。絶対に公開しないでください

### 2. 環境変数の設定

`.env.local`ファイル（または`.env`ファイル）に以下を追加：

```env
# Supabase設定（既存）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 管理者ユーザー作成用（新規追加）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Key認証用（新規追加）
# このキーはAPI呼び出し時に必須です。強力なランダム文字列を設定してください
ADMIN_API_KEY=your_secure_random_api_key
```

### 3. セキュリティ確認

- `.env.local`は`.gitignore`に含まれていることを確認
- Service Role Keyは**絶対に**Gitにコミットしない
- 本番環境では、環境変数として安全に設定する

## API使用方法

### エンドポイント

```
POST /api/admin/create-user
```

### リクエスト

**Content-Type**: `application/json`

**Body**:
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "key": "your-admin-api-key"
}
```

**注意**: `key`パラメータは必須です。環境変数`ADMIN_API_KEY`と一致する必要があります。

### レスポンス

#### 成功時 (201 Created)

```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "admin@example.com",
    "user_metadata": {
      "role": "admin"
    },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### エラー時

**401 Unauthorized** - API Key認証エラー
```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**400 Bad Request** - バリデーションエラー
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**409 Conflict** - 既存ユーザー
```json
{
  "success": false,
  "error": "User with this email already exists"
}
```

**500 Internal Server Error** - サーバーエラー
```json
{
  "success": false,
  "error": "Failed to create user"
}
```

### 使用例

#### cURL

```bash
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securePassword123",
    "key": "your-admin-api-key"
  }'
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('/api/admin/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'securePassword123',
    key: 'your-admin-api-key', // 環境変数 ADMIN_API_KEY と一致する必要があります
  }),
});

const data = await response.json();
console.log(data);
```

## バリデーション

### Email
- 有効なメールアドレス形式であること
- 必須項目

### Password
- 最低8文字以上
- 必須項目

## セキュリティ注意事項

1. **Service Role Keyの保護**
   - サーバーサイドでのみ使用
   - クライアントサイドに公開しない
   - Gitにコミットしない

2. **API Keyの保護**
   - `ADMIN_API_KEY`は強力なランダム文字列を設定（推奨: 32文字以上）
   - サーバーサイドでのみ使用
   - クライアントサイドに公開しない
   - Gitにコミットしない
   - 本番環境では定期的にローテーションを検討

3. **API Routeの保護**
   - API Key認証により、不正なアクセスを防止
   - 本番環境では、追加のセキュリティ対策（レート制限、IP制限）を検討
   - HTTPSを使用して通信を暗号化

4. **パスワードポリシー**
   - より強力なパスワード要件を設定することを推奨
   - パスワードマネージャーの使用を推奨

## トラブルシューティング

### エラー: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
- `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`が設定されているか確認
- サーバーを再起動して環境変数を読み込む

### エラー: "Invalid or missing API key"
- リクエストボディに`key`パラメータが含まれているか確認
- `key`の値が環境変数`ADMIN_API_KEY`と一致しているか確認
- `.env.local`に`ADMIN_API_KEY`が設定されているか確認

### エラー: "User with this email already exists"
- 既に同じメールアドレスでユーザーが存在します
- 別のメールアドレスを使用するか、既存ユーザーを削除してください

### エラー: "Invalid email format"
- メールアドレスの形式が正しいか確認してください

### エラー: "Password must be at least 8 characters long"
- パスワードは8文字以上である必要があります

## 関連ファイル

- `utils/supabaseAdmin.ts` - Supabase Admin Client
- `app/api/admin/create-user/route.ts` - API Route実装
