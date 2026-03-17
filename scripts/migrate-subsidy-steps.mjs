/**
 * subsidy_steps テーブルを作成するマイグレーション
 * DATABASE_URL または SUPABASE_DB_URL を使用（.env.local / .env / .env.development を順に読む）
 * 実行: npm run migrate:subsidy-steps
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ENV_FILES = ['.env.local', '.env', '.env.development.local', '.env.development'];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadEnv() {
  for (const name of ENV_FILES) {
    loadEnvFile(join(root, name));
  }
}

const SQL = `
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

loadEnv();
const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('DATABASE_URL or SUPABASE_DB_URL not set. Add to .env or .env.local and retry.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query(SQL);
  console.log('OK: Table subsidy_steps created.');
} catch (e) {
  console.error('Migration error:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
