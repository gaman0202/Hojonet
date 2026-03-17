-- Allow user_type 'introducer' in profiles (紹介者: 顧客に紐づく)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_user_type;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_user_type
  CHECK (user_type IN ('customer', 'member', 'expert', 'assistant', 'admin', 'introducer'));

COMMENT ON COLUMN profiles.user_type IS 'ユーザー種別（customer: 申請者、member: 申請者のメンバー、expert: 専門家、assistant: 専門家のアシスタント、admin: 管理者、introducer: 紹介者（顧客に紐づく））';
