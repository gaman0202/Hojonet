import { NextResponse } from 'next/server';
import { Client } from 'pg';

const SQL = `
-- 補助金ごとの申請フロー段階（管理画面で編集、案件作成時に case_steps にコピー）
CREATE TABLE IF NOT EXISTS subsidy_steps (
  id BIGSERIAL PRIMARY KEY,
  subsidy_id BIGINT NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  estimated_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subsidy_steps IS '補助金の申請フロー段階（管理画面で設定、案件の進行ガイドに表示）';
CREATE INDEX IF NOT EXISTS idx_subsidy_steps_subsidy_id ON subsidy_steps(subsidy_id);
`;

/**
 * GET: subsidy_steps テーブルを作成
 * DATABASE_URL（Supabase → Settings → Database → Connection string）が .env.local に必要
 */
export async function GET() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    return NextResponse.json(
      { error: 'DATABASE_URL or SUPABASE_DB_URL not set. Add Supabase connection string to .env.local and retry.' },
      { status: 500 }
    );
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(SQL);
    return NextResponse.json({ ok: true, message: 'Table subsidy_steps created.' });
  } catch (e) {
    console.error('subsidy_steps migration error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    await client.end();
  }
}
