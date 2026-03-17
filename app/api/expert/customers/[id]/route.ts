// app/api/expert/customers/[id]/route.ts

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

const STATUS_TAG: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'review',
  hearing: 'hearing',
  pending_contract: 'consultation',
  in_progress: 'in_progress',
  accepted: 'accepted',
  rejected: 'rejected',
};

function formatDate(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** GET: 전문가의 고객 1명 + 案件一覧・統計・活動履歴 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userGroupId } = await params;
    if (!userGroupId) {
      return NextResponse.json({ error: 'リクエストが不正です。' }, { status: 400 });
    }

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

    type CaseRow = { id: number; user_group_id: string; status: string; title: string | null; subsidy_id: number | null; amount: string | null; deadline: string | null; progress_rate: number | null; created_at: string | null; updated_at: string | null };
    let caseList: CaseRow[] = [];

    const { data: assignedCases } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id, status, title, subsidy_id, amount, deadline, progress_rate, created_at, updated_at')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id}`)
      .eq('user_group_id', userGroupId)
      .neq('status', 'rejected');

    if (assignedCases) caseList = assignedCases as CaseRow[];

    if (subsidyIds.length > 0 && caseList.length === 0) {
      const { data: unassignedCases } = await supabaseAdmin
        .from('cases')
        .select('id, user_group_id, status, title, subsidy_id, amount, deadline, progress_rate, created_at, updated_at')
        .is('expert_group_id', null)
        .in('subsidy_id', subsidyIds)
        .eq('user_group_id', userGroupId)
        .neq('status', 'rejected');
      if (unassignedCases?.length) caseList = unassignedCases as CaseRow[];
    }

    if (caseList.length === 0) {
      return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });
    }

    const statusActive = new Set(['draft', 'submitted', 'under_review', 'hearing', 'pending_contract', 'in_progress']);
    const activeCases = caseList.filter((c) => statusActive.has(c.status ?? '')).length;

    let profileRow: { full_name?: string | null; company_name?: string | null; email?: string | null; phone?: string | null; industry?: string | null; location?: string | null } | null = null;

    const byId = await supabaseAdmin
      .from('profiles')
      .select('full_name, company_name, email, phone, industry, location')
      .eq('id', userGroupId)
      .maybeSingle();

    if (byId.data) {
      profileRow = byId.data;
    } else {
      const byGroup = await supabaseAdmin
        .from('profiles')
        .select('full_name, company_name, email, phone, industry, location')
        .eq('group_id', userGroupId)
        .limit(1)
        .maybeSingle();
      profileRow = byGroup.data ?? null;
    }

    const name = profileRow?.full_name?.trim() || profileRow?.email?.trim() || '';
    const nameInitial = name ? name.charAt(0) : '?';

    const customer = {
      id: userGroupId,
      name: name || '（名前なし）',
      nameInitial: nameInitial || '?',
      email: profileRow?.email?.trim() ?? '',
      phone: profileRow?.phone?.trim() ?? '',
      company: profileRow?.company_name?.trim() ?? '',
      industry: profileRow?.industry?.trim() ?? '',
      location: profileRow?.location?.trim() ?? '',
      activeCases,
    };

    const subsidyIdsFromCases = [...new Set(caseList.map((c) => c.subsidy_id).filter(Boolean))] as number[];
    let subsidyMap: Record<number, { title: string; amount_description: string | null }> = {};
    if (subsidyIdsFromCases.length > 0) {
      const { data: subsidies } = await supabaseAdmin
        .from('subsidies')
        .select('id, title, amount_description')
        .in('id', subsidyIdsFromCases);
      for (const s of subsidies || []) {
        const id = (s as { id: number }).id;
        subsidyMap[id] = {
          title: (s as { title?: string }).title?.trim() || '',
          amount_description: (s as { amount_description?: string | null }).amount_description?.trim() || null,
        };
      }
    }

    const caseIds = caseList.map((c) => c.id);
    let introducerByCase: Record<number, { name: string; email: string }> = {};
    if (caseIds.length > 0) {
      const { data: refs } = await supabaseAdmin
        .from('referrals')
        .select('case_id, introducer_id')
        .in('case_id', caseIds);
      const introIds = [...new Set((refs || []).map((r: { introducer_id: number }) => r.introducer_id))];
      const caseToIntro: Record<number, number> = {};
      for (const r of (refs || []) as { case_id: number; introducer_id: number }[]) {
        caseToIntro[r.case_id] = r.introducer_id;
      }
      if (introIds.length > 0) {
        const { data: intros } = await supabaseAdmin
          .from('introducers')
          .select('id, name, email')
          .in('id', introIds);
        for (const i of intros || []) {
          const id = (i as { id: number }).id;
          const nameI = (i as { name?: string }).name?.trim() ?? '';
          const emailI = (i as { email?: string }).email?.trim() ?? '';
          for (const [caseId, introId] of Object.entries(caseToIntro)) {
            if (introId === id) introducerByCase[Number(caseId)] = { name: nameI, email: emailI };
          }
        }
      }
    }

    const casesOut = caseList.map((c) => {
      const sub = c.subsidy_id ? subsidyMap[c.subsidy_id] : null;
      const title = sub?.title || c.title?.trim() || '案件';
      const amount = c.amount?.trim() || sub?.amount_description || '';
      return {
        id: c.id,
        subsidyId: c.subsidy_id ?? null,
        tag: STATUS_TAG[c.status ?? ''] ?? c.status ?? 'consultation',
        title,
        deadline: formatDate(c.deadline),
        progress: c.progress_rate ?? 0,
        amount,
        updatedAt: c.updated_at ?? c.created_at ?? null,
        introducer: introducerByCase[c.id] || undefined,
      };
    });

    const caseSummary = {
      total: caseList.length,
      inProgress: caseList.filter((c) => statusActive.has(c.status ?? '')).length,
      completed: caseList.filter((c) => (c.status ?? '') === 'accepted').length,
      underReview: caseList.filter((c) => (c.status ?? '') === 'under_review').length,
    };

    const activityHistory = caseList
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 10)
      .map((c, idx) => {
        const d = c.updated_at || c.created_at;
        const dateStr = d ? (() => {
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? '' : `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
        })() : '';
        const sub = c.subsidy_id ? subsidyMap[c.subsidy_id] : null;
        const title = sub?.title || c.title?.trim() || '案件';
        return {
          id: idx + 1,
          description: `${title}の案件を更新`,
          date: dateStr,
          icon: 'document' as const,
        };
      });

    // 顧客の profile id（customer_notes 用）。id または group_id で解決
    let customerProfileId: string | null = null;
    const profileById = await supabaseAdmin.from('profiles').select('id').eq('id', userGroupId).maybeSingle();
    if (profileById.data?.id) {
      customerProfileId = profileById.data.id as string;
    } else {
      const profileByGroup = await supabaseAdmin.from('profiles').select('id').eq('group_id', userGroupId).limit(1).maybeSingle();
      customerProfileId = profileByGroup.data?.id as string ?? null;
    }

    let memo = '';
    if (customerProfileId) {
      const { data: note } = await supabaseAdmin
        .from('customer_notes')
        .select('content')
        .eq('expert_id', user.id)
        .eq('customer_id', customerProfileId)
        .maybeSingle();
      memo = (note?.content as string)?.trim() ?? '';
    }

    return NextResponse.json({
      customer,
      caseSummary,
      cases: casesOut,
      activityHistory,
      memo,
    });
  } catch (e) {
    console.error('GET expert customer by id error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PATCH: 顧客メモの保存（customer_notes を upsert） */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userGroupId } = await params;
    if (!userGroupId) {
      return NextResponse.json({ error: 'リクエストが不正です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const memo = typeof body.memo === 'string' ? body.memo.trim() : '';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    const groupId = profile?.group_id ?? profile?.id ?? user.id;

    const { data: assignedCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id}`)
      .eq('user_group_id', userGroupId)
      .limit(1);

    if (!assignedCases?.length) {
      return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });
    }

    let customerProfileId: string | null = null;
    const profileById = await supabaseAdmin.from('profiles').select('id').eq('id', userGroupId).maybeSingle();
    if (profileById.data?.id) {
      customerProfileId = profileById.data.id as string;
    } else {
      const profileByGroup = await supabaseAdmin.from('profiles').select('id').eq('group_id', userGroupId).limit(1).maybeSingle();
      customerProfileId = profileByGroup.data?.id as string ?? null;
    }

    if (!customerProfileId) {
      return NextResponse.json({ error: '顧客プロフィールが見つかりません。' }, { status: 404 });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('customer_notes')
      .upsert(
        {
          expert_id: user.id,
          customer_id: customerProfileId,
          content: memo || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expert_id,customer_id' }
      );

    if (upsertError) {
      console.error('PATCH customer_notes error:', upsertError);
      return NextResponse.json({ error: 'メモの保存に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ success: true, memo: memo || '' });
  } catch (e) {
    console.error('PATCH expert customer memo error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
