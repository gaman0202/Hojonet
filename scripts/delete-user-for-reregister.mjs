/**
 * 사용자 삭제 후 재가입 가능하게 (auth, profiles, case_members, email_invites.used_by 해제)
 * 실행: node scripts/delete-user-for-reregister.mjs
 * 환경변수: DELETE_USER_EMAIL=bluebourne907@gmail.com
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TARGET_EMAIL = process.env.DELETE_USER_EMAIL || 'bluebourne907@gmail.com';

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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function findUserByEmail(email) {
  const target = email.toLowerCase().trim();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let u = data?.users?.find((x) => (x.email || '').toLowerCase() === target);
  if (u) return u;
  let page = 1;
  while (true) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    const users = json.users || [];
    u = users.find((x) => (x.email || '').toLowerCase() === target);
    if (u) return u;
    if (users.length < 100) break;
    page++;
  }
  return null;
}

async function main() {
  console.log('삭제 대상:', TARGET_EMAIL);
  const user = await findUserByEmail(TARGET_EMAIL);
  if (!user) {
    console.error('auth.users에서 해당 이메일 사용자를 찾을 수 없습니다.');
    process.exit(1);
  }
  console.log('user id:', user.id);

  // 1. case_members 삭제
  const { error: cmErr } = await supabase.from('case_members').delete().eq('user_id', user.id);
  if (!cmErr) console.log('case_members 삭제 완료');
  else if (cmErr.code !== 'PGRST116') console.warn('case_members:', cmErr.message);

  // 2. profiles 삭제 (있으면)
  const { error: pErr } = await supabase.from('profiles').delete().eq('id', user.id);
  if (!pErr) console.log('profiles 삭제 완료');
  else if (pErr.code !== 'PGRST116') console.warn('profiles:', pErr.message);

  // 3. email_invites.used_by 해제 (재가입 시 같은 초대 사용 가능)
  const { error: eiErr } = await supabase
    .from('email_invites')
    .update({ used_by: null, used_at: null })
    .eq('used_by', user.id);
  if (!eiErr) console.log('email_invites.used_by 해제 완료');
  else console.warn('email_invites:', eiErr.message);

  // 4. auth 삭제 (identities + users)
  const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error('auth 삭제 실패:', authErr.message);
    process.exit(1);
  }
  console.log('auth.users 삭제 완료');
  console.log('\n완료. 이제', TARGET_EMAIL, '으로 다시 회원가입할 수 있습니다.');
}

main();
