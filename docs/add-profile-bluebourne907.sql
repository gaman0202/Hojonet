-- bluebourne907@naver.com: auth에는 있고 profiles에 없는 사용자 프로필 추가
-- Supabase Dashboard > SQL Editor 에서 실행
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'bluebourne907@naver.com';
  v_group_id UUID;
  v_role TEXT := 'member';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.users에 해당 이메일 사용자가 없습니다: %', v_email;
  END IF;

  -- 이미 profiles 있으면 스킵
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE NOTICE '이미 profiles가 있습니다. id=%', v_user_id;
    RETURN;
  END IF;

  -- email_invites에서 group_id, role 조회 (최신 1건)
  SELECT group_id, COALESCE(role, 'member') INTO v_group_id, v_role
  FROM public.email_invites
  WHERE LOWER(email) = LOWER(v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_group_id IS NULL THEN
    v_group_id := v_user_id;
    v_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, business_type, employees, user_type, group_id)
  VALUES (v_user_id, v_email, '', '', '', '', v_role, v_group_id);

  RAISE NOTICE 'profiles 추가 완료: id=%, user_type=%, group_id=%', v_user_id, v_role, v_group_id;

  -- case_members 보완 (email_invites에 case_id 있는 경우)
  BEGIN
    INSERT INTO public.case_members (case_id, user_id, role)
    SELECT ei.case_id, v_user_id, COALESCE(ei.role, 'member')
    FROM public.email_invites ei
    WHERE LOWER(ei.email) = LOWER(v_email)
      AND ei.case_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.case_members cm WHERE cm.case_id = ei.case_id AND cm.user_id = v_user_id)
    LIMIT 1;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'case_members는 이미 존재합니다.';
  END;
END $$;
