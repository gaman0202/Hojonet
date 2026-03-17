-- 紹介者メモ（専門家が紹介者について残すメモ）
ALTER TABLE introducers ADD COLUMN IF NOT EXISTS memo TEXT;
COMMENT ON COLUMN introducers.memo IS '専門家が紹介者について残すメモ';
