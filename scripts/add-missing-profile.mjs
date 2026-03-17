/**
 * auth에는 있지만 profiles에 없는 사용자에게 프로필 추가
 * 실행: node scripts/add-missing-profile.mjs
 * 환경변수: ADD_PROFILE_EMAIL=bluebourne907@naver.com (또는 스크립트 내 상수)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const TARGET_EMAIL = process.env.ADD_PROFILE_EMAIL || 'bluebourne907@naver.com';

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
  let total = 0;
  while (true) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    if (json.error) {
      console.error('Auth API error:', json.error);
      break;
    }
    const users = json.users || [];
    total += users.length;
    u = users.find((x) => (x.email || '').toLowerCase() === target);
    if (u) return u;
    if (users.length < 100) break;
    page++;
  }
  console.log('   (전체', total, '명 중 검색 완료)');
  return null;
}

async function main() {
  console.log('대상:', TARGET_EMAIL);
  console.log('1. auth.users에서 사용자 조회...');
  const user = await findUserByEmail(TARGET_EMAIL);
  if (!user) {
    console.error('해당 이메일 사용자를 auth에서 찾을 수 없습니다.');
    process.exit(1);
  }
  console.log('   id:', user.id);

  console.log('2. 기존 profiles 확인...');
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).single();
  if (existing) {
    console.log('   이미 profiles가 있습니다. 스킵.');
    process.exit(0);
  }

  console.log('3. email_invites에서 group_id, role 조회...');
  const emailLower = TARGET_EMAIL.toLowerCase();
  const { data: invites } = await supabase
    .from('email_invites')
    .select('group_id, role, case_id')
    .ilike('email', emailLower)
    .order('created_at', { ascending: false })
    .limit(5);
  const invite = Array.isArray(invites) && invites.length > 0 ? invites[0] : null;
  const groupId = invite?.group_id || user.id;
  const userType = invite?.role || 'member';
  console.log('   group_id:', groupId, 'user_type:', userType);

  console.log('4. profiles INSERT...');
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.name || null,
    company_name: user.user_metadata?.companyName || null,
    phone: '',
    business_type: '',
    location: user.user_metadata?.location || null,
    industry: user.user_metadata?.industry || null,
    employees: '',
    user_type: userType,
    group_id: groupId,
  });

  if (error) {
    console.error('INSERT 실패:', error.message);
    process.exit(1);
  }
  console.log('   완료');

  console.log('5. case_members 확인 및 보완...');
  if (invite?.case_id) {
    const { error: cmErr } = await supabase.from('case_members').insert({
      case_id: invite.case_id,
      user_id: user.id,
      role: invite.role || 'member',
    });
    if (cmErr && cmErr.code !== '23505') {
      console.warn('   case_members 추가 실패:', cmErr.message);
    } else if (!cmErr) {
      console.log('   case_members 추가 완료 (case_id:', invite.case_id, ')');
    } else {
      console.log('   case_members 이미 존재 (case_id:', invite.case_id, ')');
    }
  } else {
    console.log('   case_id 없음 (그룹 초대만 해당)');
  }
  console.log('\n완료. 이제 대시보드에서 안건이 보여야 합니다.');
}

main();
