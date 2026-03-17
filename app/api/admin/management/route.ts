import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

type RegionOrArray = { name?: string } | { name?: string }[] | null | undefined;
function getRelationName(v: RegionOrArray): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
}

type ActivityRow = { activity_name?: string; display_order?: number };
function sortByOrder<T extends { display_order?: number }>(arr: T[]): T[] {
  return [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

/**
 * GET: 案件管理一覧（補助金＋案件数・専門家数）
 * supabaseAdmin で取得するため RLS の影響を受けず正しい件数が返る
 */
export async function GET() {
  try {
    const { data: subsidyRows, error: subError } = await supabaseAdmin
      .from('subsidies')
      .select(`
        id,
        title,
        amount_description,
        application_period_end,
        overview,
        m_regions(name),
        m_institutions(name),
        eligible_activities(activity_name, display_order)
      `)
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Admin management GET subsidies error:', subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const rows = subsidyRows ?? [];
    const subsidyIds = rows.map((r) => r.id as number);

    if (subsidyIds.length === 0) {
      return NextResponse.json({ subsidies: [] });
    }

    const [casesRes, configsRes] = await Promise.all([
      supabaseAdmin.from('cases').select('subsidy_id').in('subsidy_id', subsidyIds),
      supabaseAdmin.from('expert_subsidy_configs').select('subsidy_id, expert_id').in('subsidy_id', subsidyIds),
    ]);

    const caseCountBySubsidy: Record<number, number> = {};
    for (const r of casesRes.data ?? []) {
      const sid = (r as { subsidy_id: number }).subsidy_id;
      if (sid != null) caseCountBySubsidy[sid] = (caseCountBySubsidy[sid] ?? 0) + 1;
    }

    const expertCountBySubsidy: Record<number, number> = {};
    const seen = new Set<string>();
    for (const r of (configsRes.data ?? []) as { subsidy_id: number; expert_id: string }[]) {
      const sid = r.subsidy_id;
      const eid = r.expert_id;
      if (sid == null || !eid) continue;
      const key = `${sid}-${eid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      expertCountBySubsidy[sid] = (expertCountBySubsidy[sid] ?? 0) + 1;
    }

    const subsidies = rows.map((row) => {
      const id = row.id as number;
      const endDate = row.application_period_end ? new Date(row.application_period_end as string) : null;
      const now = new Date();
      const isOpen = !endDate || endDate > now;
      const regionName = getRelationName(row.m_regions as RegionOrArray);
      const orgName = getRelationName(row.m_institutions as RegionOrArray);
      const location = [regionName, orgName].filter(Boolean).join('・') || '全国';
      const caseCount = caseCountBySubsidy[id] ?? 0;
      const expertCount = expertCountBySubsidy[id] ?? 0;
      return {
        id: String(id),
        status: isOpen ? 'open' : 'closed',
        statusLabel: isOpen ? '公募中' : '募集終了',
        caseCount,
        title: (row.title as string) ?? '',
        amount: (row.amount_description as string) ?? '未設定',
        expertCount,
        location,
        industry: orgName || '全国',
        deadline: endDate
          ? `${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`
          : '期限なし',
        overview: (row.overview as string) ?? '',
        eligibleActivities: sortByOrder((row.eligible_activities ?? []) as ActivityRow[]).map((a) => a.activity_name ?? ''),
        caseNumber: caseCount,
      };
    });

    return NextResponse.json({ subsidies });
  } catch (e) {
    console.error('Admin management GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
