import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'review' | 'approved' | 'rejected';
type Priority = 'high' | 'medium' | 'low';

interface FormQuestionPayload {
  question: string;
  order?: number;
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  status?: TaskStatus;
  assignee_id?: string;
  is_required?: boolean;
  remind_at?: string;
  form_questions?: FormQuestionPayload[];
}

// 認証ユーザー取得用のSupabaseクライアント
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

// GET: タスク詳細を取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // タスクを取得
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        case:cases!tasks_case_id_fkey(id, expert_group_id, user_group_id),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, icon_url),
        reviewer:profiles!tasks_reviewer_id_fkey(id, full_name, icon_url)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    // ユーザーのプロフィールを取得してアクセス権限を確認
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    // アクセス権限チェック（未割当案件は専門家ロールでアクセス可）
    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (e) {
    console.error('Get task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// PATCH: タスクを更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // タスクを取得
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        case:cases!tasks_case_id_fkey(id, expert_group_id, user_group_id)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    // ユーザーのプロフィールを取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    // アクセス権限チェック（未割当案件は専門家ロールでアクセス可）
    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const body: UpdateTaskRequest = await request.json();

    // 更新データを構築
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.deadline !== undefined) {
      updateData.deadline = body.deadline || null;
      // 残り日数を再計算
      if (body.deadline) {
        const deadline = new Date(body.deadline);
        const now = new Date();
        updateData.days_remaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        updateData.days_remaining = null;
      }
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      // 完了時はcompleted_atを設定（完了は approved に統一）
      if (body.status === 'approved') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id || null;
    if (body.is_required !== undefined) updateData.is_required = body.is_required;
    if (body.remind_at !== undefined) updateData.remind_at = body.remind_at || null;
    if ((body as { is_new?: boolean }).is_new !== undefined) updateData.is_new = (body as { is_new?: boolean }).is_new;

    // タスクを更新
    const taskIdNum = parseInt(String(taskId), 10);
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // フォームタイプの場合、form_questions が渡されていれば task_form_definitions を置き換え
    if (
      (task as { type?: string }).type === 'form_input' &&
      Array.isArray(body.form_questions)
    ) {
      const { error: deleteDefError } = await supabaseAdmin
        .from('task_form_definitions')
        .delete()
        .eq('task_id', taskIdNum);

      if (deleteDefError) {
        console.error('Error deleting form definitions:', deleteDefError);
      }

      const toInsert = body.form_questions
        .filter((q) => typeof q.question === 'string' && q.question.trim())
        .map((q, index) => ({
          task_id: taskIdNum,
          question_text: (q.question as string).trim(),
          input_type: 'text' as const,
          options: null as unknown,
          is_required: false,
          display_order: q.order ?? index + 1,
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('task_form_definitions')
          .insert(toInsert);
        if (insertError) {
          console.error('Error inserting form definitions:', insertError);
        }
      }
    }

    // アクティビティログを記録
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: user.id,
      action_type: 'task_updated',
      description: `タスク「${task.title}」を更新しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error('Update task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// DELETE: タスクを削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // タスクを取得
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        case:cases!tasks_case_id_fkey(id, expert_group_id)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    // ユーザーのプロフィールを取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    // 専門家/アシスタント/管理者のみ削除可能
    if (!['expert', 'assistant', 'admin'].includes(profile.user_type)) {
      return NextResponse.json({ error: 'タスクを削除できるのは専門家のみです。' }, { status: 403 });
    }

    // 専門家グループに所属、または未割当案件なら専門家ロールは削除可能（case が配列で返る場合あり）
    const caseRaw = task.case as { expert_group_id: string } | { expert_group_id: string }[] | null;
    const caseInfo = Array.isArray(caseRaw) ? caseRaw[0] ?? null : caseRaw;
    const canDelete =
      profile.group_id === caseInfo?.expert_group_id ||
      (caseInfo?.expert_group_id == null && ['expert', 'assistant', 'admin'].includes(profile.user_type ?? ''));
    if (!canDelete) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    // タスクを削除（id は数値で比較）
    const taskIdNum = parseInt(String(taskId), 10);
    if (Number.isNaN(taskIdNum)) {
      return NextResponse.json({ error: 'タスクIDが無効です。' }, { status: 400 });
    }
    const { error: deleteError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskIdNum);

    if (deleteError) {
      console.error('Error deleting task:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // アクティビティログを記録
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: user.id,
      action_type: 'task_deleted',
      description: `タスク「${task.title}」を削除しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
