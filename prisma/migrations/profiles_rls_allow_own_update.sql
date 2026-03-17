-- ==========================================
-- profiles: 本人が自分のプロフィールを更新できるようにする
-- ==========================================
-- ダッシュボードのプロフィール編集（電話番号等）はブラウザから
-- createClient(anon + JWT) で PATCH するため、RLS で UPDATE を許可する必要がある。
-- これがないと 0 行更新で 204 が返り、保存されていないように見える。

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = id )
  WITH CHECK ( (select auth.uid()) = id );
