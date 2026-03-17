-- 招待トークンテーブル
CREATE TABLE IF NOT EXISTS invite_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'introducer')),
    group_id UUID NOT NULL,   -- 招待された人が所属するグループID（= 招待者の group_id）
    used_by UUID,             -- 使用した新規ユーザーID
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_case_id ON invite_tokens(case_id);

COMMENT ON TABLE invite_tokens IS '案件メンバー招待トークン';
COMMENT ON COLUMN invite_tokens.token IS '招待リンクに含まれるランダムトークン';
COMMENT ON COLUMN invite_tokens.inviter_id IS '招待したユーザーのID';
COMMENT ON COLUMN invite_tokens.case_id IS '対象案件ID';
COMMENT ON COLUMN invite_tokens.role IS '招待されたユーザーの役割（member/introducer）';
COMMENT ON COLUMN invite_tokens.group_id IS '招待された人が所属するグループID';

-- handle_new_user トリガー関数を更新: metadata に userType/groupId がある場合はそちらを使う
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_meta JSONB;
  v_user_type VARCHAR(20);
  v_group_id UUID;
BEGIN
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- userType のデフォルトは customer
  v_user_type := COALESCE(NULLIF(user_meta->>'userType', ''), 'customer');
  
  -- groupId: metadata にあればそれを使い、なければ自分のID（customer/expert）
  IF user_meta->>'groupId' IS NOT NULL AND user_meta->>'groupId' <> '' THEN
    v_group_id := (user_meta->>'groupId')::UUID;
  ELSE
    v_group_id := NEW.id;
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
