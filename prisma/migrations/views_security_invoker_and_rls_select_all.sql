-- 3ビューを SECURITY INVOKER に変更し、全部見れる情報として
-- base テーブルに SELECT USING(true) を追加
-- (Supabase Linter: security_definer_view 対応)

-- 1) ビューを SECURITY INVOKER に変更

DROP VIEW IF EXISTS public.dashboard_cases_summary;
CREATE VIEW public.dashboard_cases_summary
  WITH (security_invoker = on)
AS
SELECT
  c.expert_group_id,
  count(*) AS total_cases,
  count(*) FILTER (WHERE c.status IN ('consultation', 'hearing', 'doc_prep', 'review')) AS active_cases,
  count(*) FILTER (WHERE c.needs_attention = true) AS attention_needed_cases,
  count(*) FILTER (WHERE c.deadline <= CURRENT_DATE + INTERVAL '7 days' AND c.status NOT IN ('accepted', 'rejected')) AS deadline_approaching_cases
FROM cases c
GROUP BY c.expert_group_id;

COMMENT ON VIEW public.dashboard_cases_summary IS 'ダッシュボード用の案件サマリービュー';

DROP VIEW IF EXISTS public.active_cases_view;
CREATE VIEW public.active_cases_view
  WITH (security_invoker = on)
AS
SELECT
  c.id,
  c.title,
  c.status,
  c.progress_rate,
  c.deadline,
  c.needs_attention,
  c.unread_message_count,
  c.pending_task_count,
  c.amount,
  s.title AS subsidy_title,
  s.amount_description AS max_amount,
  p.full_name AS assignee_name,
  p.user_type AS assignee_role
FROM cases c
JOIN subsidies s ON c.subsidy_id = s.id
LEFT JOIN profiles p ON c.assignee_id = p.id
WHERE c.status NOT IN ('accepted', 'rejected');

COMMENT ON VIEW public.active_cases_view IS '進行中案件一覧用ビュー';

DROP VIEW IF EXISTS public.subsidies_with_status;
CREATE VIEW public.subsidies_with_status
  WITH (security_invoker = on)
AS
SELECT
  s.*,
  get_subsidy_status(s.application_period_start, s.application_period_end) AS status
FROM subsidies s;

COMMENT ON VIEW public.subsidies_with_status IS '補助金情報にステータスを含むビュー。通常はこのビューを使用して補助金情報を取得する';

-- 2) 全部見れる情報として、authenticated がビュー経由で全行読めるように
--    base テーブルに SELECT USING(true) を追加（PERMISSIVE で既存ポリシーと OR）
-- subsidies は既に "Allow SELECT on subsidies" (qual = true) あり

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Allow select all for views'
  ) THEN
    CREATE POLICY "Allow select all for views"
      ON public.cases FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow select all for views'
  ) THEN
    CREATE POLICY "Allow select all for views"
      ON public.profiles FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;
