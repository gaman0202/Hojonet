-- ==========================================
-- email_invites テーブルを専門家チーム招待に対応させる
-- ==========================================

-- 1. 기존 외래 키 제약조건 확인 및 제거 (필요시)
-- case_id의 외래 키 제약조건을 찾아서 제거해야 NULL을 허용할 수 있음
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- case_id에 대한 외래 키 제약조건 찾기
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'email_invites'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%case_id%'
    LIMIT 1;
    
    -- 외래 키 제약조건이 있으면 제거
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE email_invites DROP CONSTRAINT IF EXISTS %I', fk_name);
    END IF;
END $$;

-- 2. case_id を NULL 許可に変更（専門家チーム招待は case と無関係）
ALTER TABLE email_invites 
ALTER COLUMN case_id DROP NOT NULL;

-- 3. role のチェック制約を更新（'expert', 'assistant' を追加）
ALTER TABLE email_invites 
DROP CONSTRAINT IF EXISTS email_invites_role_check;

ALTER TABLE email_invites 
ADD CONSTRAINT email_invites_role_check 
CHECK (role IN ('member', 'introducer', 'expert', 'assistant'));

-- 4. case_id가 NULL이 아닐 때만 외래 키 제약조건 적용 (선택사항)
-- 전문가 팀 초대의 경우 case_id가 NULL이므로 외래 키 제약조건을 다시 추가하지 않음
-- 또는 부분 외래 키를 사용하려면 CHECK 제약조건을 사용할 수 있지만, PostgreSQL에서는 지원하지 않음
-- 따라서 외래 키 제약조건은 제거된 상태로 유지

COMMENT ON COLUMN email_invites.case_id IS '案件ID（専門家チーム招待の場合は NULL）';
COMMENT ON COLUMN email_invites.role IS '役割（member, introducer, expert, assistant）';
