-- ==========================================
-- handle_new_user 関数を専門家チーム招待に対応させる
-- ==========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_meta JSONB;
  v_user_type VARCHAR(20);
  v_group_id UUID;
  invite_row RECORD;
BEGIN
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- メール招待: 登録メールが email_invites に未使用で存在するか確認
  SELECT id, role, group_id, case_id INTO invite_row
  FROM public.email_invites
  WHERE LOWER(email) = LOWER(NEW.email)
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF invite_row.id IS NOT NULL THEN
    -- メール招待あり → 招待の role / group_id を使用
    v_user_type := invite_row.role;
    v_group_id := invite_row.group_id;

    UPDATE public.email_invites
    SET used_by = NEW.id, used_at = NOW()
    WHERE id = invite_row.id;

    -- 該当案件の case_members に追加（case_id が NULL でない場合のみ）
    IF invite_row.case_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.case_members (case_id, user_id, role)
        VALUES (invite_row.case_id, NEW.id, invite_row.role);
      EXCEPTION
        WHEN unique_violation THEN NULL;
      END;
    END IF;
  ELSE
    -- メール招待なし → 従来どおり metadata またはデフォルト
    v_user_type := COALESCE(NULLIF(user_meta->>'userType', ''), 'customer');
    IF user_meta->>'groupId' IS NOT NULL AND user_meta->>'groupId' <> '' THEN
      v_group_id := (user_meta->>'groupId')::UUID;
    ELSE
      v_group_id := NEW.id;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    company_name,
    business_type,
    location,
    industry,
    employees,
    user_type,
    group_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(user_meta->>'name', NULL),
    COALESCE(NULLIF(user_meta->>'companyName', ''), NULL),
    COALESCE(NULLIF(user_meta->>'businessType', ''), NULL),
    COALESCE(NULLIF(user_meta->>'location', ''), NULL),
    COALESCE(NULLIF(user_meta->>'industry', ''), NULL),
    COALESCE(NULLIF(user_meta->>'employees', ''), NULL),
    v_user_type,
    v_group_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
