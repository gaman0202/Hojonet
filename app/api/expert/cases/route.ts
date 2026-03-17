// app/api/expert/cases/route.ts
// POST: 専門家が「この顧客で、この補助金の案件を作成」する

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
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as { path?: string })
          );
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/**
 * POST: 顧客＋補助金で新規案件を作成
 * body: { subsidyId: number, customerId: string }  (customerId = user_group_id に使う。profile id または group_id)
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const subsidyId = typeof body.subsidyId === 'number' ? body.subsidyId : parseInt(String(body.subsidyId || ''), 10);
    const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';

    if (!customerId || Number.isNaN(subsidyId)) {
      return NextResponse.json({ error: 'subsidyId と customerId が必要です' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    const expertGroupId = profile?.group_id ?? profile?.id ?? user.id;

    const { data: subsidy } = await supabaseAdmin
      .from('subsidies')
      .select('id, title, application_period_end')
      .eq('id', subsidyId)
      .single();

    if (!subsidy) {
      return NextResponse.json({ error: '補助金が見つかりません' }, { status: 404 });
    }

    let userGroupId: string = customerId;
    const byId = await supabaseAdmin.from('profiles').select('id, group_id').eq('id', customerId).maybeSingle();
    if (byId.data?.id) {
      userGroupId = byId.data.group_id ?? byId.data.id;
    } else {
      const byGroup = await supabaseAdmin.from('profiles').select('id').eq('group_id', customerId).limit(1).maybeSingle();
      if (byGroup.data?.id) userGroupId = customerId;
    }

    const title = (subsidy.title as string)?.trim() || `案件（補助金ID: ${subsidyId}）`;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('cases')
      .insert({
        subsidy_id: subsidyId,
        user_group_id: userGroupId,
        expert_group_id: expertGroupId,
        assignee_id: user.id,
        title,
        status: 'consultation',
        progress_rate: 0,
        contract_status: 'negotiating',
        deadline: (subsidy as { application_period_end?: string | null }).application_period_end ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Expert create case insert error:', insertError);
      return NextResponse.json({ error: insertError.message ?? '案件の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      caseId: inserted.id,
      subsidyId,
    });
  } catch (e) {
    console.error('POST expert cases error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
