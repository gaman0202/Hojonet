import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

/**
 * GET: この補助金に参加中の専門家一覧（管理画面用・supabaseAdminでRLSを迂回）
 * /subsidies/[id]/experts と同じ expert_subsidy_configs を参照
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subsidyIdNum = parseInt(id, 10);
    if (Number.isNaN(subsidyIdNum)) {
      return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });
    }

    const { data: configs, error: configError } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('expert_id')
      .eq('subsidy_id', subsidyIdNum);

    if (configError) {
      console.error('Admin experts config fetch error:', configError);
      return NextResponse.json({ experts: [] });
    }

    const expertIds = [...new Set((configs ?? []).map((c) => c.expert_id).filter(Boolean))];
    if (expertIds.length === 0) {
      return NextResponse.json({ experts: [] });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', expertIds);

    if (profileError || !profiles) {
      console.error('Admin experts profiles fetch error:', profileError);
      return NextResponse.json({ experts: [] });
    }

    const experts = profiles.map((p) => ({
      id: String(p.id),
      name: (p.full_name as string) ?? '担当者',
      email: (p.email as string) ?? '',
      avatarChar: ((p.full_name as string) ?? '担').trim().charAt(0) || '担',
    }));

    return NextResponse.json({ experts });
  } catch (e) {
    console.error('Admin management experts GET error:', e);
    return NextResponse.json({ experts: [] });
  }
}
