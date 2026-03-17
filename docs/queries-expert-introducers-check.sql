-- ============================================================
-- 전문가 소개자 목록이 비어 있을 때 DB 확인용 쿼리
-- Supabase SQL Editor에서 실행 (로그인한 전문가 user id로 치환 후 사용)
-- ============================================================

-- 0) 로그인한 전문가의 user id 확인 (브라우저에서 로그인한 뒤, auth.users 또는 profiles에서 확인)
-- 예: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
-- 아래 쿼리들에서 :expert_user_id 를 실제 UUID로 바꿔서 실행하세요.

-- 1) case_members에 introducer가 한 명이라도 있는지 확인
SELECT role, count(*) 
FROM case_members 
GROUP BY role 
ORDER BY role;

-- 2) 전문가가 담당하는 case가 있는지 확인
-- (아래 'YOUR-EXPERT-USER-ID' 를 실제 전문가 user id로 치환)
SELECT id, status, expert_group_id, assignee_id, user_group_id
FROM cases
WHERE status IS DISTINCT FROM 'rejected'
  AND (
    expert_group_id = 'YOUR-EXPERT-USER-ID'
    OR expert_group_id = (SELECT group_id FROM profiles WHERE id = 'YOUR-EXPERT-USER-ID')
    OR assignee_id = 'YOUR-EXPERT-USER-ID'
  )
ORDER BY id DESC
LIMIT 20;

-- 3) 전문가 담당 case들 중에서 role=introducer 인 멤버가 있는지
-- (YOUR-EXPERT-USER-ID 치환)
WITH expert_cases AS (
  SELECT c.id
  FROM cases c
  LEFT JOIN profiles p ON p.id = 'YOUR-EXPERT-USER-ID'
  WHERE c.status IS DISTINCT FROM 'rejected'
    AND (
      c.expert_group_id = 'YOUR-EXPERT-USER-ID'
      OR c.expert_group_id = COALESCE(p.group_id, 'YOUR-EXPERT-USER-ID')
      OR c.assignee_id = 'YOUR-EXPERT-USER-ID'
    )
)
SELECT cm.case_id, cm.user_id, cm.role, pr.full_name, pr.email
FROM case_members cm
JOIN expert_cases ec ON ec.id = cm.case_id
LEFT JOIN profiles pr ON pr.id = cm.user_id
WHERE cm.role = 'introducer'
ORDER BY cm.case_id;

-- 4) 전체 case_members에서 introducer만 (데이터 존재 여부 확인)
SELECT case_id, user_id, role
FROM case_members
WHERE role = 'introducer'
ORDER BY case_id;

-- 5) cases 테이블 컬럼 확인 (expert_group_id / assignee_id 값이 어떻게 들어가 있는지)
SELECT id, expert_group_id, assignee_id, user_group_id, status
FROM cases
ORDER BY id DESC
LIMIT 10;

-- ============================================================
-- [소개자 招待中 해결] case 26, jbg5815@naver.com 진단
-- ============================================================

-- 6) case 26의 email_invites (해당 이메일 초대가 있는지, used_by 여부)
SELECT id, case_id, email, role, used_by, used_at, created_at
FROM email_invites
WHERE case_id = 26
  AND LOWER(TRIM(email)) = LOWER('jbg5815@naver.com');

-- 7) 해당 이메일로 가입한 프로필
SELECT id, email, full_name, user_type, group_id
FROM profiles
WHERE LOWER(TRIM(email)) = LOWER('jbg5815@naver.com');

-- 8) case 26의 case_members (소개자로 해당 user가 있는지)
SELECT cm.id, cm.case_id, cm.user_id, cm.role, p.email, p.full_name
FROM case_members cm
LEFT JOIN profiles p ON p.id = cm.user_id
WHERE cm.case_id = 26;

-- 9) [복구] 가입은 했는데 used_by 미처리 + case_members 없을 때 한 번만 실행
-- (아래 :profile_id, :invite_id 는 6)·7) 결과로 채워서 실행)
/*
-- 예시: 프로필 id가 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 초대 id가 123 이면
UPDATE email_invites
SET used_by = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', used_at = NOW()
WHERE id = 123 AND case_id = 26 AND used_by IS NULL;

INSERT INTO case_members (case_id, user_id, role)
SELECT 26, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'introducer'
WHERE NOT EXISTS (
  SELECT 1 FROM case_members
  WHERE case_id = 26 AND user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);
*/

-- 10) [한 번에 복구] case 26 + jbg5815@naver.com: 가입된 프로필이 있으면 초대 연동 및 case_members 추가
-- (Supabase SQL Editor에서 그대로 실행 가능)
UPDATE email_invites ei
SET used_by = p.id, used_at = NOW()
FROM profiles p
WHERE ei.case_id = 26
  AND ei.used_by IS NULL
  AND LOWER(TRIM(ei.email)) = LOWER(TRIM(p.email))
  AND LOWER(TRIM(p.email)) = LOWER('jbg5815@naver.com');

INSERT INTO case_members (case_id, user_id, role)
SELECT ei.case_id, ei.used_by, ei.role
FROM email_invites ei
WHERE ei.case_id = 26
  AND ei.used_by IS NOT NULL
  AND LOWER(TRIM(ei.email)) = LOWER('jbg5815@naver.com')
  AND NOT EXISTS (
    SELECT 1 FROM case_members cm
    WHERE cm.case_id = ei.case_id AND cm.user_id = ei.used_by
  );
