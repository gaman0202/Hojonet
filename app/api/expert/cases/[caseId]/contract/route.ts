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

/**
 * POST: 専門家が契約進行確認を送信する
 * Body: { description?: string, paymentTerms?: string, scope?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id')
      .eq('id', caseIdNum)
      .single();
    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isExpert =
      profile.group_id === caseRow.expert_group_id ||
      profile.id === caseRow.expert_group_id ||
      (['expert', 'assistant', 'admin'].includes(profile.user_type ?? '') && caseRow.expert_group_id == null);
    if (!isExpert) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const paymentTerms = typeof body.paymentTerms === 'string' ? body.paymentTerms.trim() : '';
    const scope = typeof body.scope === 'string' ? body.scope.trim() : '';

    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin
      .from('case_contract_progress')
      .upsert(
        {
          case_id: caseIdNum,
          description: description || null,
          payment_terms: paymentTerms || null,
          scope: scope || null,
          submitted_by: user.id,
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: 'case_id' }
      );

    if (upsertError) {
      console.error('Contract progress upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: existingTask } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('case_id', caseIdNum)
      .eq('title', '契約書類')
      .limit(1)
      .maybeSingle();

    let contractTaskId: number;
    if (existingTask && typeof (existingTask as { id: number }).id === 'number') {
      contractTaskId = (existingTask as { id: number }).id;
    } else {
      const { data: newTask, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          case_id: caseIdNum,
          title: '契約書類',
          description: '担当者から送られた契約関連の書類です。タスクタブでご確認ください。',
          type: 'file_upload',
          assignee_role: 'customer',
          priority: 'medium',
          status: 'pending',
          deadline,
        })
        .select('id')
        .single();
      if (taskError || !newTask) {
        console.error('Contract task create error:', taskError);
        return NextResponse.json({ ok: true, submittedAt: now });
      }
      contractTaskId = (newTask as { id: number }).id;
    }

    const systemContent = '契約進行確認を送信しました。タスクタブの「契約書類」で書類をご確認ください。';
    await supabaseAdmin.from('messages').insert({
      case_id: caseIdNum,
      sender_id: user.id,
      content: systemContent,
      is_system_message: true,
    });

    return NextResponse.json({ ok: true, submittedAt: now, contractTaskId });
  } catch (e) {
    console.error('Contract progress POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
