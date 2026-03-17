import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * GET: この補助金に「参加」した担当専門家一覧（expert_subsidy_configs ベース）
 * 公開API（認証不要）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subsidyIdNum = parseInt(id, 10);
    if (isNaN(subsidyIdNum)) {
      return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });
    }

    const { data: configs, error: configError } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('expert_id')
      .eq('subsidy_id', subsidyIdNum);

    if (configError) {
      console.error('Expert subsidy configs fetch error:', configError);
      return NextResponse.json({ experts: [] });
    }

    const expertIds = [...new Set((configs ?? []).map((c) => c.expert_id).filter(Boolean))];
    if (expertIds.length === 0) {
      return NextResponse.json({ experts: [] });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        icon_url,
        expert_profiles (
          one_line_message,
          specialties,
          office_name,
          registration_year,
          registration_number
        )
      `)
      .in('id', expertIds);

    if (profileError || !profiles) {
      console.error('Profiles fetch error:', profileError);
      return NextResponse.json({ experts: [] });
    }

    const getExpertProfile = (p: (typeof profiles)[0]): Record<string, unknown> => {
      const raw = (p as { expert_profiles?: unknown }).expert_profiles;
      if (Array.isArray(raw) && raw.length > 0) return (raw[0] as Record<string, unknown>) || {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
      return {};
    };
    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)) : typeof v === 'string' ? (v ? [v] : []) : [];

    const experts = profiles.map((p) => {
      const expObj = getExpertProfile(p);
      const specialties = expObj.specialties != null ? asArray(expObj.specialties) : ['会社・法人', '外国人関連'];
      return {
        id: String(p.id),
        name: p.full_name || '担当者',
        iconUrl: p.icon_url || null,
        rating: 4.1,
        message:
          (expObj.one_line_message as string) ||
          'ご依頼者様の立場に寄り添い、複雑な手続きを分かりやすく丁寧にサポートいたします。',
        services: specialties,
        office: (expObj.office_name as string) || '行政書士事務所',
        registrationYear:
          expObj.registration_year != null ? `${expObj.registration_year}年` : '登録年不明',
        registrationNumber: (expObj.registration_number as string) || '00000000',
      };
    });

    return NextResponse.json({ experts });
  } catch (e) {
    console.error('Subsidy experts GET error:', e);
    return NextResponse.json({ experts: [] });
  }
}
