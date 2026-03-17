import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// POST: タスクを完了（check/confirmationタイプのタスク用）
export async function POST(
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

    // 専門家は担当者に関係なく完了可能。顧客は自分が担当のタスクのみ完了可能
    const isExpertGroup =
      profile.group_id === caseInfo?.expert_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);
    const isUserGroup = profile.group_id === caseInfo?.user_group_id;

    if (!isExpertGroup) {
      if (task.assignee_role === 'customer' && !isUserGroup) {
        return NextResponse.json({ error: 'このタスクを完了できるのは顧客のみです。' }, { status: 403 });
      }
      if (task.assignee_role === 'expert' || task.assignee_role === 'assistant') {
        return NextResponse.json({ error: 'このタスクを完了できるのは専門家のみです。' }, { status: 403 });
      }
      // 顧客が完了できるのは confirmation/general のみ（提出・承認フローは別API）
      if (!['confirmation', 'general'].includes(task.type)) {
        return NextResponse.json({ error: 'このタスク種別は提出・承認フローが必要です。' }, { status: 400 });
      }
    }

    // 完了可能なステータスか確認
    if (!['pending', 'in_progress'].includes(task.status)) {
      return NextResponse.json({ error: '現在のステータスではタスクを完了できません。' }, { status: 400 });
    }

    // 完了は approved に統一（専門家・ユーザーともに。ユーザー画面で「承認済み」表示）
    const newStatus = 'approved';

    // タスクを完了に更新
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // アクティビティログを記録
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: user.id,
      action_type: 'task_completed',
      description: `タスク「${task.title}」を完了しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error('Complete task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// DELETE: タスク完了を取り消し（元に戻す）
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

    // アクセス権限チェック
    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    // 完了済み（approved または completed）のみ取り消し可能
    if (task.status !== 'approved' && task.status !== 'completed') {
      return NextResponse.json({ error: 'タスクは完了していません。' }, { status: 400 });
    }

    // タスクを進行中に戻す
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'in_progress',
        completed_at: null,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error uncompleting task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // アクティビティログを記録
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: user.id,
      action_type: 'task_uncompleted',
      description: `タスク「${task.title}」の完了を取り消しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error('Uncomplete task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
