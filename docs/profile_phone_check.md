# プロフィール電話番号の保存確認

## 1. DBで保存されているか確認するクエリ

Supabase ダッシュボード → **SQL Editor** で実行してください。

### 自分のユーザーだけ見る（id を指定）

```sql
SELECT id, full_name, email, phone, company_name, updated_at
FROM profiles
WHERE id = 'e666e14a-0583-4c67-86a8-641f858411fb';
```

- `phone` が `NULL` や空 → まだ保存されていない（RLS で UPDATE がブロックされていた可能性）
- `phone` に値が入っている → DB には保存済み

### 全ユーザーの電話番号を一覧

```sql
SELECT id, full_name, email, phone, updated_at
FROM profiles
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;
```

---

## 2. 画面で電話番号が表示されない場合

1. **RLS の UPDATE ポリシーを追加したか**
   - まだなら `prisma/migrations/profiles_rls_allow_own_update.sql` を Supabase で実行する
   - 実行後、もう一度「プロフィール編集」で電話番号を入力して「保存」

2. **保存後にマイページへ遷移したとき**
   - `/api/auth/me` が `profiles` を `select('*')` で取得しているので、DB に `phone` が入っていれば「連絡先」に表示される
   - DB に保存されていれば、ページを再読み込み（F5）すれば表示される

3. **編集画面で「保存」後すぐにプロフィールへ飛んでも表示されない場合**
   - 保存がまだ RLS で 0 行更新のままなら、上記 1 のマイグレーション実行 → 再度保存 → クエリで確認
