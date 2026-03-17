-- bluebourne907@gmail.com (또는 @naver.com) 계정 삭제 후 재가입 가능하게
-- Supabase Dashboard > SQL Editor 에서 실행
-- 이메일이 다르면 아래 v_email 값만 수정하면 됨

DO $$
DECLARE
  v_email TEXT := 'bluebourne907@naver.com';
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE '해당 이메일 사용자가 auth.users에 없습니다. v_email 값을 확인하세요.';
    RETURN;
  END IF;

  -- 1. case_members 삭제
  DELETE FROM public.case_members WHERE user_id = v_user_id;

  -- 2. profiles 삭제 (있으면)
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 3. email_invites used_by 해제 (재가입 시 같은 초대 링크 사용 가능)
  UPDATE public.email_invites SET used_by = NULL, used_at = NULL WHERE used_by = v_user_id;

  -- 4. auth.identities 삭제
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- 5. auth.users 삭제
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE '삭제 완료: %. 이제 다시 회원가입할 수 있습니다.', v_email;
END $$;
