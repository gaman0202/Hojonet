# パスワードリセットメールが届かない場合

`/forgot-password` で「リセットリンクを送信」を押してもメールが届かないときは、以下を確認してください。

## 1. Supabase ダッシュボードの設定

### Redirect URLs（必須）

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト
2. **Authentication** → **URL Configuration**
3. **Redirect URLs** に次の URL を追加：
   - 開発: `http://localhost:3000/update-password`
   - 本番: `https://あなたのドメイン/update-password`

ここに含まれていないと、メール内のリンクをクリックしてもリセット完了ページに遷移できません。

### Site URL

- **Site URL** がアプリのベース URL になっているか確認（例: `http://localhost:3000` または本番 URL）。

## 2. メール送信の仕組み

- 未設定時、Supabase は **組み込みのメール送信**（制限あり）を使います。
- **開発環境**: 無料枠では送信数・到達率に制限がある場合があります。
- **本番環境**: **Authentication** → **Email Templates** のほか、**Project Settings** → **Auth** で **SMTP** を設定すると、自前 SMTP で送信でき、届きやすくなります。

## 3. 確認すること

- 入力したメールアドレスが、Supabase の **Authentication** → **Users** に存在するか。
- 迷惑メール・プロモーション・ゴミ箱フォルダを確認する。
- 同じメールで短時間に何度も送信していないか（レート制限）。

## 4. ローカルでメール内容を確認したい場合

Supabase の **Authentication** → **Email Templates** で「Reset password」を編集できます。  
開発時は **Logs** や **Inbucket**（Supabase のローカル開発用メール受信）で送信内容を確認する方法もあります。
