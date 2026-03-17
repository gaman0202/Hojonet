import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * GET: 管理者設定画面用データ（統計・マスタ一覧）
 */
export async function GET() {
  try {
    const [
      { count: subsidiesCount },
      { count: casesCount },
      { data: expertGroups },
      { data: customerGroups },
      { data: regions },
      { data: institutions },
      { data: industries },
    ] = await Promise.all([
      supabaseAdmin.from('subsidies').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('cases').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('group_id').eq('user_type', 'expert'),
      supabaseAdmin.from('profiles').select('group_id').eq('user_type', 'customer'),
      supabaseAdmin.from('m_regions').select('id, name, code, position').order('position', { ascending: true }),
      supabaseAdmin.from('m_institutions').select('id, name, code, position').order('position', { ascending: true }),
      supabaseAdmin.from('m_industries').select('id, name, code, position').order('position', { ascending: true }),
    ]);

    const expertGroupIds = new Set((expertGroups ?? []).map((r) => (r as { group_id: string }).group_id).filter(Boolean));
    const customerGroupIds = new Set((customerGroups ?? []).map((r) => (r as { group_id: string }).group_id).filter(Boolean));

    return NextResponse.json({
      stats: {
        subsidiesCount: subsidiesCount ?? 0,
        casesCount: casesCount ?? 0,
        expertGroupsCount: expertGroupIds.size,
        customerGroupsCount: customerGroupIds.size,
        regionsCount: (regions ?? []).length,
        institutionsCount: (institutions ?? []).length,
        industriesCount: (industries ?? []).length,
      },
      regions: (regions ?? []).map((r) => ({ id: (r as { id: number }).id, name: (r as { name: string }).name, code: (r as { code?: string }).code })),
      institutions: (institutions ?? []).map((r) => ({ id: (r as { id: number }).id, name: (r as { name: string }).name, code: (r as { code?: string }).code })),
      industries: (industries ?? []).map((r) => ({ id: (r as { id: number }).id, name: (r as { name: string }).name, code: (r as { code?: string }).code })),
    });
  } catch (e) {
    console.error('Admin settings GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
