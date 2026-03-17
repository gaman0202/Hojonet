-- ==========================================
-- handle_new_user: phone / business_type / employees を空文字で挿入
-- profiles に NOT NULL 制約がある環境で INSERT 失敗する問題を修正
-- (Admin createUser は '' を使うが、トリガーは NULL を挿入していた)
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
    v_user_type := invite_row.role;
    v_group_id := invite_row.group_id;

    UPDATE public.email_invites
    SET used_by = NEW.id, used_at = NOW()
    WHERE id = invite_row.id;

    IF invite_row.case_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.case_members (case_id, user_id, role)
        VALUES (invite_row.case_id, NEW.id, invite_row.role);
      EXCEPTION
        WHEN unique_violation THEN NULL;
      END;
    END IF;
  ELSE
    v_user_type := COALESCE(NULLIF(user_meta->>'userType', ''), 'customer');
    IF user_meta->>'groupId' IS NOT NULL AND user_meta->>'groupId' <> '' THEN
      v_group_id := (user_meta->>'groupId')::UUID;
    ELSE
      v_group_id := NEW.id;
    END IF;
  END IF;

  -- phone, business_type, employees: NOT NULL 制約対応のため空文字を使用
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    company_name,
    phone,
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
    COALESCE(NULLIF(TRIM(user_meta->>'phone'), ''), ''),
    COALESCE(NULLIF(TRIM(user_meta->>'businessType'), ''), ''),
    COALESCE(NULLIF(user_meta->>'location', ''), NULL),
    COALESCE(NULLIF(user_meta->>'industry', ''), NULL),
    COALESCE(NULLIF(TRIM(user_meta->>'employees'), ''), ''),
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
