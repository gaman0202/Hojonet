-- ==========================================
-- email_invites テーブルの case_id 외래 키 제약조건 제거
-- 전문가 팀 초대의 경우 case_id가 NULL이어야 하므로 외래 키 제약조건을 제거해야 함
-- ==========================================

-- case_id에 대한 외래 키 제약조건 찾기 및 제거
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- case_id에 대한 외래 키 제약조건 찾기
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'email_invites'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'case_id'
    LIMIT 1;
    
    -- 외래 키 제약조건이 있으면 제거
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE email_invites DROP CONSTRAINT IF EXISTS %I', fk_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', fk_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on case_id';
    END IF;
END $$;
