import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

type RelationName = { name?: string } | { name?: string }[] | null | undefined;
function getRelationName(v: RelationName): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
}

/**
 * GET: ログイン専門家が「参加」した補助金一覧（expert_subsidy_configs ベース）
 * 案件管理ページで表示する用
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: configs, error: configError } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('subsidy_id')
      .eq('expert_id', user.id);

    if (configError) {
      console.error('Expert subsidies config fetch error:', configError);
      return NextResponse.json({ subsidies: [] });
    }

    const subsidyIds = [...new Set((configs ?? []).map((c) => c.subsidy_id).filter((id) => id != null))];
    if (subsidyIds.length === 0) {
      return NextResponse.json({ subsidies: [] });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    const groupId = profile?.group_id ?? profile?.id ?? user.id;
    const { data: caseCountRows } = await supabaseAdmin
      .from('cases')
      .select('subsidy_id')
      .in('subsidy_id', subsidyIds)
      .or(`expert_group_id.eq.${groupId},expert_group_id.is.null`)
      .neq('status', 'rejected'); // 却下された案件を除外

    const caseCountBySubsidy: Record<number, number> = {};
    (caseCountRows ?? []).forEach((r: { subsidy_id: number }) => {
      caseCountBySubsidy[r.subsidy_id] = (caseCountBySubsidy[r.subsidy_id] ?? 0) + 1;
    });

    const { data: rows, error: subsidyError } = await supabaseAdmin
      .from('subsidies')
      .select(`
        id,
        title,
        amount_description,
        application_period_end,
        subsidy_rate,
        overview,
        m_regions(name),
        m_institutions(name),
        eligible_activities(activity_name)
      `)
      .in('id', subsidyIds)
      .order('created_at', { ascending: false });

    if (subsidyError || !rows) {
      console.error('Subsidies fetch error:', subsidyError);
      return NextResponse.json({ subsidies: [] });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const subsidies = (rows as {
      id: number;
      title: string;
      amount_description?: string | null;
      application_period_end?: string | null;
      subsidy_rate?: string | null;
      overview?: string | null;
      m_regions?: RelationName;
      m_institutions?: RelationName;
      eligible_activities?: { activity_name: string }[] | null;
    }[]).map((row) => {
      const endDateStr = row.application_period_end;
      const endDate = endDateStr
        ? (() => {
            const m = String(endDateStr).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (!m) return null;
            return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
          })()
        : null;
      const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;
      const isOpen = !endDateOnly || today <= endDateOnly;
      const daysLeft =
        endDateOnly && today <= endDateOnly
          ? Math.ceil((endDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      const statusLabel = !endDateOnly ? '公募中' : today > endDateOnly ? '募集終了' : daysLeft <= 7 ? '締切間近' : '公募中';
      const regionName = getRelationName(row.m_regions);
      const orgName = getRelationName(row.m_institutions);
      const tags = (row.eligible_activities ?? []).map((a) => a.activity_name);
      const deadlineStr = endDate
        ? `${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`
        : '期限なし';

      const count = caseCountBySubsidy[row.id] ?? 0;
      const caseCountStr = `${count}件の案件`;
      const caseNumberStr = `${count}件`;
      return {
        id: row.id,
        status: statusLabel,
        statusColor: statusLabel === '公募中' || statusLabel === '締切間近' ? '#1447E6' : '#364153',
        statusBg: statusLabel === '公募中' || statusLabel === '締切間近' ? '#DBEAFE' : '#F3F4F6',
        statusBorder: statusLabel === '公募中' || statusLabel === '締切間近' ? '#BBD8FF' : '#E5E7EB',
        caseCount: caseCountStr,
        caseCountColor: '#8200DB',
        caseCountBg: '#F3E8FF',
        caseCountBorder: '#E9D4FF',
        title: row.title ?? '',
        amount: row.amount_description ?? '未設定',
        subsidyRate: row.subsidy_rate ?? '未設定',
        region: regionName || '全国',
        industry: orgName || '全国',
        deadline: deadlineStr,
        deadlineUrgent: isOpen && daysLeft <= 7,
        description: row.overview ?? '',
        tags,
        caseNumber: caseNumberStr,
      };
    });

    return NextResponse.json({ subsidies });
  } catch (e) {
    console.error('Expert subsidies GET error:', e);
    return NextResponse.json({ subsidies: [] });
  }
}
