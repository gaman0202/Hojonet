-- メール招待用テーブル（「このメールを招待した」情報）
CREATE TABLE IF NOT EXISTS email_invites (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'introducer')),
    group_id UUID NOT NULL,
    used_by UUID,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_invites_email ON email_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_email_invites_used_by ON email_invites(used_by);
CREATE INDEX IF NOT EXISTS idx_email_invites_case_id ON email_invites(case_id);

COMMENT ON TABLE email_invites IS 'メール招待（登録時にこのメールがあれば member/group_id を適用）';
COMMENT ON COLUMN email_invites.email IS '招待したメールアドレス';
COMMENT ON COLUMN email_invites.group_id IS '招待された人が所属するグループID（招待者の group_id）';

-- handle_new_user: メール招待を優先。登録メールが email_invites にあればそれで user_type / group_id を設定
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

    -- 該当案件の case_members に追加
    BEGIN
      INSERT INTO public.case_members (case_id, user_id, role)
      VALUES (invite_row.case_id, NEW.id, invite_row.role);
    EXCEPTION
      WHEN unique_violation THEN NULL;
    END;
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
