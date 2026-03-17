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

async function assertTaskAccess(taskId: string, userId: string) {
  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('*, case:cases!tasks_case_id_fkey(id, expert_group_id, user_group_id)')
    .eq('id', taskId)
    .single();
  if (taskError || !task) return { error: NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 }), task: null };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();
  if (!profile) return { error: NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 }), task: null };

  const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
  const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
  const hasAccess =
    profile.group_id === caseInfo?.expert_group_id ||
    profile.group_id === caseInfo?.user_group_id ||
    profile.id === caseInfo?.user_group_id ||
    (caseInfo?.expert_group_id == null && isExpertRole);
  if (!hasAccess) return { error: NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 }), task: null };

  return { error: null, task, profile };
}

/** GET: タスクのフォーム定義（質問一覧）と既存回答を取得 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { taskId } = await params;
    const { error: accessError, task, profile } = await assertTaskAccess(taskId, user.id);
    if (accessError) return accessError;
    if (!task || !profile || task.type !== 'form_input') {
      return NextResponse.json({ error: 'このタスクはフォーム形式ではありません。' }, { status: 400 });
    }

    const { data: definitions } = await supabaseAdmin
      .from('task_form_definitions')
      .select('id, question_text, input_type, options, is_required, display_order')
      .eq('task_id', taskId)
      .order('display_order', { ascending: true });

    const definitionIds = (definitions ?? []).map((d: { id: number }) => d.id);
    let responses: { definition_id: number; answer_value: string | null }[] = [];
    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const isExpert = profile.group_id === caseInfo?.expert_group_id || (caseInfo?.expert_group_id == null && ['expert', 'assistant', 'admin'].includes(profile.user_type ?? ''));
    // 専門家が開いた場合は顧客（担当者）の回答を返す
    const respondentUserId = isExpert
      ? (task.assignee_id ?? caseInfo?.user_group_id ?? user.id)
      : user.id;

    if (definitionIds.length > 0) {
      const { data: res } = await supabaseAdmin
        .from('task_form_responses')
        .select('definition_id, answer_value')
        .eq('user_id', respondentUserId)
        .in('definition_id', definitionIds);
      responses = res ?? [];
    }

    const answers: Record<number, string> = {};
    responses.forEach((r: { definition_id: number; answer_value: string | null }) => {
      answers[r.definition_id] = r.answer_value ?? '';
    });

    return NextResponse.json({
      task: { id: task.id, title: task.title, description: task.description, status: task.status },
      questions: definitions ?? [],
      answers,
    });
  } catch (e) {
    console.error('Task form GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** POST: フォーム回答を保存し、任意で提出 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { taskId } = await params;
    const { error: accessError, task } = await assertTaskAccess(taskId, user.id);
    if (accessError) return accessError;
    if (!task || task.type !== 'form_input') {
      return NextResponse.json({ error: 'このタスクはフォーム形式ではありません。' }, { status: 400 });
    }

    const body = await request.json();
    const answers = body.answers as Record<string, string | string[]> | undefined;
    const submit = !!body.submit;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: '回答（answers）は必須です。' }, { status: 400 });
    }

    const { data: definitions } = await supabaseAdmin
      .from('task_form_definitions')
      .select('id')
      .eq('task_id', taskId);

    const definitionIds = (definitions ?? []).map((d: { id: number }) => d.id);
    if (definitionIds.length > 0) {
      await supabaseAdmin
        .from('task_form_responses')
        .delete()
        .eq('user_id', user.id)
        .in('definition_id', definitionIds);
    }

    for (const def of definitions ?? []) {
      const value = answers[String(def.id)];
      if (value === undefined) continue;
      const answerValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      await supabaseAdmin.from('task_form_responses').insert({
        definition_id: def.id,
        user_id: user.id,
        answer_value: answerValue,
      });
    }

    if (submit && ['pending', 'in_progress', 'rejected'].includes(task.status)) {
      await supabaseAdmin
        .from('tasks')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', taskId);
    }

    return NextResponse.json({ ok: true, submitted: submit });
  } catch (e) {
    console.error('Task form POST error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
