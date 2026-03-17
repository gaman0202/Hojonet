import { NextResponse } from 'next/server';
import { Client } from 'pg';

const SQL = `
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS business_hours JSONB;
COMMENT ON COLUMN expert_profiles.business_hours IS '営業時間（曜日別: monday〜sunday, start/end/isClosed）';
`;

/**
 * GET: expert_profiles に business_hours カラムを追加
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
    return NextResponse.json({ ok: true, message: 'Column business_hours added to expert_profiles.' });
  } catch (e) {
    console.error('business_hours migration error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    await client.end();
  }
}
