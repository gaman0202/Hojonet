/**
 * profile-icons ストレージバケットを自動作成（public, 5MB制限）
 * 実行: node scripts/create-profile-icons-bucket.mjs
 * .env.local の NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を使用
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check .env.local)');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const bucketId = 'profile-icons';
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === bucketId);

  if (exists) {
    console.log(`Bucket "${bucketId}" already exists.`);
    return;
  }

  const { data, error } = await supabase.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit: 5242880, // 5MB
  });

  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }
  console.log('Bucket "profile-icons" created (public, 5MB limit).');
}

main();
