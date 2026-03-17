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

// POST: タスクを承認（専門家のみ）
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

    // 専門家/アシスタント/管理者のみ承認可能
    if (!['expert', 'assistant', 'admin'].includes(profile.user_type)) {
      return NextResponse.json({ error: 'タスクを承認できるのは専門家のみです。' }, { status: 403 });
    }

    // 専門家グループに所属、または未割当案件なら専門家ロールは承認可能
    const caseInfo = task.case as { expert_group_id: string; user_group_id: string } | null;
    const canApprove =
      profile.group_id === caseInfo?.expert_group_id ||
      (caseInfo?.expert_group_id == null);
    if (!canApprove) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    // 承認可能なステータスか確認
    if (!['submitted', 'review'].includes(task.status)) {
      return NextResponse.json({ error: '現在のステータスではタスクを承認できません。' }, { status: 400 });
    }

    // タスクを承認済みに更新（ユーザー向けNEWフラグを立てる）
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        completed_at: new Date().toISOString(),
        is_new: true,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // アクティビティログを記録
    await supabaseAdmin.from('activity_logs').insert({
      case_id: task.case_id,
      actor_id: user.id,
      action_type: 'task_approved',
      description: `タスク「${task.title}」を承認しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: task.title,
    });

    // 通知を作成（ユーザー向け）
    // TODO: user_group_idからユーザーを取得して通知を送る

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error('Approve task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
