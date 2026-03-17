// app/api/expert/introducers/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** GET: 専門家が担当する案件で「顧客が招待した紹介者」(case_members role=introducer) の一覧 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();
    const groupId = profile?.group_id ?? user.id;

    // 専門家が担当する案件（expert_group_id または assignee_id）
    const { data: expertCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .neq('status', 'rejected');

    const caseIds = (expertCases || []).map((c: { id: number }) => c.id);
    if (caseIds.length === 0) {
      return NextResponse.json({ introducers: [], totalIntroducers: 0 });
    }

    // それらの案件で role=introducer のメンバー
    const { data: memberRows } = await supabaseAdmin
      .from('case_members')
      .select('case_id, user_id')
      .in('case_id', caseIds)
      .eq('role', 'introducer');

    const list = (memberRows || []) as { case_id: number; user_id: string }[];
    const introducerUserIds = [...new Set(list.map((r) => r.user_id))];
    if (introducerUserIds.length === 0) {
      return NextResponse.json({ introducers: [], totalIntroducers: 0 });
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, company_name, industry, location')
      .in('id', introducerUserIds);

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; full_name?: string | null; email?: string | null; phone?: string | null; company_name?: string | null; industry?: string | null; location?: string | null }) => [p.id, p])
    );

    const caseIdsWithIntro = [...new Set(list.map((r) => r.case_id))];
    const { data: applicantRows } = await supabaseAdmin
      .from('case_members')
      .select('case_id, user_id')
      .in('case_id', caseIdsWithIntro)
      .eq('role', 'applicant');
    const caseToApplicant = new Map<number, string>();
    for (const r of (applicantRows || []) as { case_id: number; user_id: string }[]) {
      if (!caseToApplicant.has(r.case_id)) caseToApplicant.set(r.case_id, r.user_id);
    }
    const applicantIds = [...new Set(caseToApplicant.values())];
    const { data: appProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', applicantIds);
    const appProfileMap = new Map(
      (appProfiles || []).map((p: { id: string; full_name?: string | null; email?: string | null }) => [p.id, p])
    );

    const referredByIntroducer: Record<string, { id: string; name: string; email: string }[]> = {};
    for (const uid of introducerUserIds) referredByIntroducer[uid] = [];
    for (const r of list) {
      const applicantId = caseToApplicant.get(r.case_id);
      if (!applicantId || applicantId === r.user_id) continue;
      const app = appProfileMap.get(applicantId) as { id: string; full_name?: string | null; email?: string | null } | undefined;
      if (!app) continue;
      const name = app.full_name?.trim() || app.email?.trim() || '（名前なし）';
      const existing = referredByIntroducer[r.user_id];
      if (!existing.some((x) => x.id === app.id)) {
        referredByIntroducer[r.user_id].push({
          id: app.id,
          name,
          email: app.email?.trim() ?? '',
        });
      }
    }

    const introducers = introducerUserIds.map((uid) => {
      const p = profileMap.get(uid) as { full_name?: string | null; email?: string | null; phone?: string | null; company_name?: string | null; industry?: string | null; location?: string | null } | undefined;
      const name = p?.full_name?.trim() || p?.email?.trim() || '';
      return {
        id: uid,
        name: name || '（名前なし）',
        nameInitial: name ? name.charAt(0) : '?',
        email: p?.email?.trim() ?? '',
        phone: p?.phone?.trim() ?? '',
        industry: p?.industry?.trim() ?? '',
        companyName: p?.company_name?.trim() ?? '',
        location: p?.location?.trim() ?? '',
        referredCustomers: referredByIntroducer[uid] ?? [],
        othersCount: 0,
      };
    });

    return NextResponse.json({ introducers, totalIntroducers: introducers.length });
  } catch (e) {
    console.error('GET expert introducers error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
