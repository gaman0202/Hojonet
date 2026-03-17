import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import type { Subsidy } from '@/app/subsidies/types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

type SubsidyRow = {
  id: number;
  title: string;
  amount_description?: string | null;
  subsidy_rate?: string | null;
  application_period_end?: string | null;
  overview?: string | null;
  m_regions?: { name?: string } | null;
  m_institutions?: { name?: string } | null;
  eligible_activities?: { activity_name: string; display_order?: number }[] | null;
};

function mapRowToSubsidy(row: SubsidyRow): Subsidy {
  const sortByOrder = <T extends { display_order?: number }>(arr: T[]): T[] =>
    [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const now = new Date();
  const endDate = row.application_period_end ? new Date(row.application_period_end) : null;
  const daysUntilDeadline = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const statusTags: string[] = [];
  if (endDate && endDate > now) {
    statusTags.push('公募中');
    if (daysUntilDeadline !== null && daysUntilDeadline <= 14) statusTags.push('締切間近');
  } else {
    statusTags.push('公募終了');
  }

  const regionName = row.m_regions?.name ?? '';
  const orgName = row.m_institutions?.name ?? '';
  const location = regionName || '全国';

  return {
    id: String(row.id),
    statusTags,
    title: row.title ?? '',
    implementingOrganization: orgName || undefined,
    location,
    deadline: row.application_period_end ? `申請期限: ${formatDate(row.application_period_end)}` : '期限なし',
    deadlineColor: daysUntilDeadline !== null && daysUntilDeadline <= 14 ? '#E7000B' : '#4A5565',
    amount: row.amount_description ?? '未設定',
    subsidyRate: row.subsidy_rate ?? '未設定',
    overview: row.overview ?? '',
    eligibleActivities: sortByOrder(row.eligible_activities ?? []).map((a) => a.activity_name),
    eligibilityConditions: [],
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('subsidies')
      .select(`
        id,
        title,
        amount_description,
        subsidy_rate,
        application_period_end,
        overview,
        m_regions(name),
        m_institutions(name),
        eligible_activities(activity_name, display_order)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subsidies:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list: Subsidy[] = (data ?? []).map((row) => mapRowToSubsidy(row as SubsidyRow));
    return NextResponse.json(list);
  } catch (e) {
    console.error('Subsidies API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
