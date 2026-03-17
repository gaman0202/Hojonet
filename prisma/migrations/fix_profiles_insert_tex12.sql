-- tex12@naver.com 用プロフィール補完（phone / business_type / employees が NOT NULL の環境用）
-- Supabase SQL Editor で実行
INSERT INTO profiles (id, email, full_name, company_name, phone, business_type, industry, location, employees, user_type, group_id, created_at, updated_at)
VALUES (
  '88ab76e2-7ea1-46a7-b138-72cb6e81740d',
  'tex12@naver.com',
  'raon',
  'raonm',
  '',
  '',
  'it',
  '32313',
  '',
  'expert',
  '88ab76e2-7ea1-46a7-b138-72cb6e81740d',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
