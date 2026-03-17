// app/api/expert/introducers/[id]/route.ts

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
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as { path?: string });
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

/** GET: 紹介者 1명 상세。id は UUID(profile id) = 顧客が案件に招待した紹介者 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: introducerIdParam } = await params;
    if (!introducerIdParam) {
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
    const groupId = profile?.group_id ?? user.id;

    const { data: expertCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .neq('status', 'rejected');
    const expertCaseIds = (expertCases || []).map((c: { id: number }) => c.id);
    if (expertCaseIds.length === 0) {
      return NextResponse.json({ error: '紹介者が見つかりません。' }, { status: 404 });
    }

    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('case_id')
      .in('case_id', expertCaseIds)
      .eq('user_id', introducerIdParam)
      .eq('role', 'introducer')
      .limit(1)
      .maybeSingle();

    if (!memberRow) {
      return NextResponse.json({ error: '紹介者が見つかりません。' }, { status: 404 });
    }

    const { data: introProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, company_name, industry, location')
      .eq('id', introducerIdParam)
      .single();

    if (!introProfile) {
      return NextResponse.json({ error: '紹介者が見つかりません。' }, { status: 404 });
    }

    const name = (introProfile.full_name as string)?.trim() || (introProfile.email as string)?.trim() || '';
    const nameInitial = name ? name.charAt(0) : '?';

    const { data: introCases } = await supabaseAdmin
      .from('case_members')
      .select('case_id')
      .eq('user_id', introducerIdParam)
      .eq('role', 'introducer');
    const caseIds = [...new Set((introCases || []).map((r: { case_id: number }) => r.case_id))].filter((id) => expertCaseIds.includes(id));
    if (caseIds.length === 0) {
      return NextResponse.json({
        introducer: {
          id: introducerIdParam,
          name: name || '（名前なし）',
          nameInitial: nameInitial || '?',
          email: (introProfile.email as string)?.trim() ?? '',
          phone: (introProfile.phone as string)?.trim() ?? '',
          industry: (introProfile.industry as string)?.trim() ?? '',
          companyName: (introProfile.company_name as string)?.trim() ?? '',
          location: (introProfile.location as string)?.trim() ?? '',
        },
        referredCustomers: [],
        caseSummary: { total: 0, inProgress: 0, completed: 0, underReview: 0 },
        caseItems: [],
        memo: '',
      });
    }

    const { data: cases } = await supabaseAdmin
      .from('cases')
      .select('id, title, status, subsidy_id, amount, deadline, progress_rate')
      .in('id', caseIds)
      .neq('status', 'rejected');
    const caseList = (cases || []) as { id: number; title: string | null; status: string | null; subsidy_id: number | null; amount: string | null; deadline: string | null; progress_rate: number | null }[];

    const subsidyIds = [...new Set(caseList.map((c) => c.subsidy_id).filter(Boolean))] as number[];
    let subsidyMap: Record<number, { title: string; amount_description: string | null }> = {};
    if (subsidyIds.length > 0) {
      const { data: subsidies } = await supabaseAdmin
        .from('subsidies')
        .select('id, title, amount_description')
        .in('id', subsidyIds);
      for (const s of subsidies || []) {
        const id = (s as { id: number }).id;
        subsidyMap[id] = {
          title: (s as { title?: string }).title?.trim() || '',
          amount_description: (s as { amount_description?: string | null }).amount_description?.trim() || null,
        };
      }
    }

    const referredCustomers: { id: string; name: string; email: string }[] = [];
    const caseIdToRefs: Record<number, { id: string; name: string; email: string }[]> = {};
    for (const caseId of caseIds) {
      const { data: applicants } = await supabaseAdmin
        .from('case_members')
        .select('user_id')
        .eq('case_id', caseId)
        .eq('role', 'applicant')
        .limit(1);
      const appId = (applicants || [])[0] as { user_id: string } | undefined;
      if (!appId?.user_id) continue;
      const { data: appProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', appId.user_id)
        .limit(1);
      const app = (appProfiles || [])[0] as { id: string; full_name?: string | null; email?: string | null } | undefined;
      if (!app) continue;
      const nameP = app.full_name?.trim() || app.email?.trim() || '（名前なし）';
      const rc = { id: app.id, name: nameP, email: app.email?.trim() ?? '' };
      if (!referredCustomers.some((x) => x.id === app.id)) referredCustomers.push(rc);
      if (!caseIdToRefs[caseId]) caseIdToRefs[caseId] = [];
      caseIdToRefs[caseId].push(rc);
    }

    const statusActive = new Set(['draft', 'submitted', 'under_review', 'hearing', 'pending_contract', 'in_progress']);
    const caseSummary = {
      total: caseList.length,
      inProgress: caseList.filter((c) => statusActive.has(c.status ?? '')).length,
      completed: caseList.filter((c) => (c.status ?? '') === 'accepted').length,
      underReview: caseList.filter((c) => (c.status ?? '') === 'under_review').length,
    };

    const colorSets = [
      { color: '#9810FA', bg: '#F3E8FF' },
      { color: '#155DFC', bg: '#DBEAFE' },
    ];
    const caseItems = caseList.map((c) => {
      const sub = c.subsidy_id ? subsidyMap[c.subsidy_id] : null;
      const title = sub?.title || (c.title?.trim()) || '案件';
      const amount = c.amount?.trim() || sub?.amount_description || '';
      const refsForCase = caseIdToRefs[c.id] ?? [];
      return {
        id: String(c.id),
        subsidyId: c.subsidy_id != null ? String(c.subsidy_id) : null,
        tag: STATUS_TAG[c.status ?? ''] ?? 'consultation',
        title,
        deadline: formatDate(c.deadline),
        progress: `進捗: ${c.progress_rate ?? 0}%`,
        amount: amount || '—',
        referredCustomers: refsForCase.map((rc, i) => ({
          ...rc,
          initial: rc.name.charAt(0),
          color: colorSets[i % colorSets.length].color,
          bg: colorSets[i % colorSets.length].bg,
        })),
      };
    });

    return NextResponse.json({
      introducer: {
        id: introducerIdParam,
        name: name || '（名前なし）',
        nameInitial: nameInitial || '?',
        email: (introProfile.email as string)?.trim() ?? '',
        phone: (introProfile.phone as string)?.trim() ?? '',
        industry: (introProfile.industry as string)?.trim() ?? '',
        companyName: (introProfile.company_name as string)?.trim() ?? '',
        location: (introProfile.location as string)?.trim() ?? '',
      },
      referredCustomers,
      caseSummary,
      caseItems,
      memo: '',
    });
  } catch (e) {
    console.error('GET expert introducer by id error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PATCH: 紹介者メモの保存（UUIDの場合は case_members ベースの紹介者のためメモ未対応で success のみ返す） */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: introducerIdParam } = await params;
    if (!introducerIdParam) {
      return NextResponse.json({ error: 'リクエストが不正です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const memo = typeof body.memo === 'string' ? body.memo.trim() : '';

    if (introducerIdParam.includes('-')) {
      return NextResponse.json({ success: true, memo: memo || '' });
    }

    const introducerId = parseInt(introducerIdParam, 10);
    if (Number.isNaN(introducerId)) {
      return NextResponse.json({ error: 'リクエストが不正です。' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('introducers')
      .update({ memo: memo || null })
      .eq('id', introducerId)
      .eq('expert_id', user.id);

    if (updateError) {
      console.error('PATCH introducer memo error:', updateError);
      return NextResponse.json({ error: 'メモの保存に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ success: true, memo: memo || '' });
  } catch (e) {
    console.error('PATCH expert introducer memo error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
