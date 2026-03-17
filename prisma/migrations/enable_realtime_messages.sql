-- Realtimeでメッセージの新規投稿を購読するために、messages を publication に追加
-- Supabase Dashboard の Table Editor で messages の Realtime を有効にしても可
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- supabase_realtime が存在しない環境では何もしない
    NULL;
END $$;
