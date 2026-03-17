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

// POST: タスクを提出（ユーザーが完了して提出）
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
      .select('id, user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      profile.id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const isExpertGroup =
      profile.group_id === caseInfo?.expert_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);
    const isUserGroup = profile.group_id === caseInfo?.user_group_id || profile.id === caseInfo?.user_group_id;
    
    if (task.assignee_role === 'customer' && !isUserGroup) {
      return NextResponse.json({ error: 'このタスクを提出できるのは顧客のみです。' }, { status: 403 });
    }
    
    if ((task.assignee_role === 'expert' || task.assignee_role === 'assistant') && !isExpertGroup) {
      return NextResponse.json({ error: 'このタスクを提出できるのは専門家のみです。' }, { status: 403 });
    }

    // 提出可能なステータスか確認
    if (!['pending', 'in_progress', 'rejected'].includes(task.status)) {
      return NextResponse.json({ error: '現在のステータスではタスクを提出できません。' }, { status: 400 });
    }

    // タスクを提出済みに更新（専門家向けNEWフラグを立てる）
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
        is_new: true,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error submitting task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const isCustomerSide = !isExpertRole;
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: isCustomerSide ? null : user.id,
      action_type: 'task_submitted',
      description: isCustomerSide
        ? `顧客がタスク「${task.title}」を提出しました`
        : `タスク「${task.title}」を提出しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    // 通知を作成（専門家向け）
    // TODO: expert_group_idから専門家を取得して通知を送る

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error('Submit task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
