import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import type { SubsidyDetails } from '@/app/subsidies/types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

type RelationName = { name?: string } | { name?: string }[] | null | undefined;
function getRelationName(v: RelationName): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
}

type ActivityRow = { activity_name: string; display_order?: number };
type ConditionRow = { condition_text: string; display_order?: number };
type DocumentRow = { document_name: string; display_order?: number };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません。' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('subsidies')
      .select(`
        *,
        m_regions(name),
        m_institutions(name),
        eligible_activities(activity_name, display_order),
        eligibility_conditions(condition_text, display_order),
        required_documents(document_name, display_order)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching subsidy detail:', error);
      return NextResponse.json(
        { error: error?.message ?? '補助金が見つかりません。' },
        { status: error?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    const sortByOrder = <T extends { display_order?: number }>(arr: T[]): T[] =>
      [...(arr || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const now = new Date();
    const endDate = data.application_period_end ? new Date(data.application_period_end) : null;
    const status = endDate && endDate > now ? '公募中' : '公募終了';

    const body: SubsidyDetails = {
      status,
      title: data.title ?? '',
      implementingOrganization: getRelationName(data.m_institutions as RelationName) || '未設定',
      region: getRelationName(data.m_regions as RelationName) || '全国',
      amount: data.amount_description ?? '未設定',
      applicationPeriod: data.application_period_end ? `~${formatDate(data.application_period_end)}` : '未設定',
      subsidyRate: data.subsidy_rate ?? '未設定',
      purpose: data.purpose ?? '',
      targetIndustries: '小売業・サービス業',
      officialPage: data.official_page_url ?? '',
      overview: data.overview ?? '',
      eligibleActivities: sortByOrder((data.eligible_activities ?? []) as ActivityRow[]).map((a) => a.activity_name),
      eligibilityConditions: sortByOrder((data.eligibility_conditions ?? []) as ConditionRow[]).map((c) => c.condition_text),
      requiredDocuments: sortByOrder((data.required_documents ?? []) as DocumentRow[]).map((d) => d.document_name),
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error('Subsidy detail API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
