-- ==========================================
-- RLS: 同一 group_id の顧客・メンバーが同じ案件のみ見えるようにする
-- ==========================================
-- ブラウザ（createClient = anon key + JWT）で cases を取得する際、
-- DB 側で「ログインユーザーの group_id に属する案件だけ」に自動で絞る。

-- 1. profiles: 自分のプロフィールのみ読める（cases ポリシーで group_id 参照するため必要）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = id );

-- 2. cases: 自分の user_group_id または 自分の group_id に一致する案件のみ読める
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see cases of their group" ON cases;
CREATE POLICY "Users see cases of their group"
  ON cases FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      user_group_id = (select auth.uid())
      OR user_group_id IN (
        SELECT group_id FROM public.profiles WHERE id = (select auth.uid()) LIMIT 1
      )
    )
  );

-- INSERT/UPDATE/DELETE は API（service role）で行う想定のため、ここでは SELECT のみポリシーを設定。
-- 必要なら後で「同一グループのみ作成・更新・削除可」のポリシーを追加可能。
