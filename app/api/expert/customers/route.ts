// app/api/expert/customers/route.ts

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

/** GET: 전문가의 고객 목록 (cases 기반 user_group_id별 프로필 + 진행중 건수) */
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

    const groupId = profile?.group_id ?? profile?.id ?? user.id;

    const { data: subsidyConfigs } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('subsidy_id')
      .eq('expert_id', user.id);

    const subsidyIds = [...new Set((subsidyConfigs || []).map((c: { subsidy_id: number }) => c.subsidy_id).filter(Boolean))];

    let caseList: { id: number; user_group_id: string; status: string }[] = [];

    const { data: assignedCases } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id, status')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id}`)
      .neq('status', 'rejected');

    if (assignedCases) caseList = assignedCases as typeof caseList;

    if (subsidyIds.length > 0) {
      const { data: unassignedCases } = await supabaseAdmin
        .from('cases')
        .select('id, user_group_id, status')
        .is('expert_group_id', null)
        .in('subsidy_id', subsidyIds)
        .neq('status', 'rejected');

      if (unassignedCases?.length) {
        const existingIds = new Set(caseList.map((c) => c.id));
        const added = (unassignedCases as typeof caseList).filter((c) => !existingIds.has(c.id));
        caseList = [...caseList, ...added];
      }
    }

    const userGroupIds = [...new Set(caseList.map((c) => c.user_group_id).filter(Boolean))] as string[];

    const activeByGroup: Record<string, number> = {};
    const statusActive = new Set(['draft', 'submitted', 'under_review', 'hearing', 'pending_contract', 'in_progress']);
    for (const c of caseList) {
      if (!c.user_group_id) continue;
      if (statusActive.has(c.status ?? '')) {
        activeByGroup[c.user_group_id] = (activeByGroup[c.user_group_id] ?? 0) + 1;
      }
    }

    const customers: {
      id: string;
      name: string;
      nameInitial: string;
      email: string;
      phone: string;
      company: string;
      industry: string;
      location: string;
      activeCases: number;
    }[] = [];

    for (const uid of userGroupIds) {
      let profileRow: { full_name?: string | null; company_name?: string | null; email?: string | null; phone?: string | null; industry?: string | null; location?: string | null } | null = null;

      const byId = await supabaseAdmin
        .from('profiles')
        .select('full_name, company_name, email, phone, industry, location')
        .eq('id', uid)
        .maybeSingle();

      if (byId.data) {
        profileRow = byId.data;
      } else {
        const byGroup = await supabaseAdmin
          .from('profiles')
          .select('full_name, company_name, email, phone, industry, location')
          .eq('group_id', uid)
          .limit(1)
          .maybeSingle();
        profileRow = byGroup.data ?? null;
      }

      const name = profileRow?.full_name?.trim() || profileRow?.email?.trim() || '';
      const nameInitial = name ? (name.charAt(0) === name.charAt(0).toUpperCase() ? name.charAt(0) : name.charAt(0).toUpperCase()) : '';

      customers.push({
        id: uid,
        name: name || '（名前なし）',
        nameInitial: nameInitial || '?',
        email: profileRow?.email?.trim() ?? '',
        phone: profileRow?.phone?.trim() ?? '',
        company: profileRow?.company_name?.trim() ?? '',
        industry: profileRow?.industry?.trim() ?? '',
        location: profileRow?.location?.trim() ?? '',
        activeCases: activeByGroup[uid] ?? 0,
      });
    }

    return NextResponse.json({ customers, totalCustomers: customers.length });
  } catch (e) {
    console.error('GET expert customers error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
