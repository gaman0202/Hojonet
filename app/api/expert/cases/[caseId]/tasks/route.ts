import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// タスクタイプの定義
type TaskType = 'file_upload' | 'form_input' | 'confirmation' | 'general';
type AssigneeRole = 'customer' | 'expert' | 'assistant';
type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'review' | 'approved' | 'rejected';

interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  assignee_role: AssigneeRole;
  assignee_id?: string;
  priority?: Priority;
  deadline?: string;
  is_required?: boolean;
  remind_at?: string;
  form_questions?: { question: string; is_required?: boolean; order?: number }[];
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

// GET: 案件のタスク一覧を取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // 案件へのアクセス権限を確認
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id, user_group_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    // ユーザーのプロフィールを取得してアクセス権限を確認
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    // アクセス権限チェック（専門家グループ / ユーザーグループ / 申請者本人、または未割当案件は専門家がアクセス可）
    // ※案件作成時に user_group_id に profile.id を保存しているため、申請者本人は profile.id で一致させる
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type);
    const hasAccess =
      profile.group_id === caseData.expert_group_id ||
      profile.group_id === caseData.user_group_id ||
      profile.id === caseData.user_group_id ||
      (caseData.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    // タスク一覧を取得
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        case_id,
        title,
        description,
        type,
        priority,
        deadline,
        days_remaining,
        assignee_role,
        assignee_id,
        status,
        is_required,
        link_url,
        remind_at,
        rejection_reason,
        submitted_at,
        reviewed_at,
        reviewer_id,
        completed_at,
        created_at,
        updated_at,
        is_new,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, icon_url),
        reviewer:profiles!tasks_reviewer_id_fkey(id, full_name, icon_url)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks ?? [] });
  } catch (e) {
    console.error('Tasks API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// POST: 新規タスクを作成（専門家のみ）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
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

    // 専門家/アシスタント/管理者のみタスク作成可能
    if (!['expert', 'assistant', 'admin'].includes(profile.user_type)) {
      return NextResponse.json({ error: 'タスクを作成できるのは専門家のみです。' }, { status: 403 });
    }

    // 案件へのアクセス権限を確認
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    // 専門家グループに所属、または未割当案件（expert_group_id が null）なら専門家ロールは作成可能
    const canCreate =
      profile.group_id === caseData.expert_group_id ||
      caseData.expert_group_id == null;
    if (!canCreate) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const body: CreateTaskRequest = await request.json();

    // バリデーション
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'タイトルは必須です。' }, { status: 400 });
    }

    if (!body.type || !['file_upload', 'form_input', 'confirmation', 'general'].includes(body.type)) {
      return NextResponse.json({ error: 'タスク種別が無効です。' }, { status: 400 });
    }

    if (!body.assignee_role || !['customer', 'expert', 'assistant'].includes(body.assignee_role)) {
      return NextResponse.json({ error: '担当者ロールが無効です。' }, { status: 400 });
    }

    // 期限から残り日数を計算
    let daysRemaining: number | null = null;
    if (body.deadline) {
      const deadline = new Date(body.deadline);
      const now = new Date();
      daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // タスクを作成
    // 顧客担当タスクは顧客に未読通知（is_new=true）、専門家担当は不要
    const isCustomerTask = body.assignee_role === 'customer';
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert({
        case_id: parseInt(caseId),
        title: body.title.trim(),
        description: body.description?.trim() || null,
        type: body.type,
        assignee_role: body.assignee_role,
        assignee_id: body.assignee_id || null,
        priority: body.priority || 'medium',
        deadline: body.deadline || null,
        days_remaining: daysRemaining,
        is_required: body.is_required ?? false,
        remind_at: body.remind_at || null,
        status: 'pending' as TaskStatus,
        is_new: isCustomerTask,
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // フォームタイプの場合、質問を task_form_definitions に保存
    if (body.type === 'form_input' && body.form_questions && body.form_questions.length > 0) {
      const questionsToInsert = body.form_questions.map((q, index) => ({
        task_id: task.id,
        question_text: q.question,
        input_type: 'text' as const,
        options: null as unknown,
        is_required: q.is_required ?? false,
        display_order: q.order ?? index + 1,
      }));
      const { error: questionsError } = await supabaseAdmin
        .from('task_form_definitions')
        .insert(questionsToInsert);
      if (questionsError) {
        console.error('Error creating form questions:', questionsError);
      }
    }

    // アクティビティログを記録（テーブルが存在する場合）
    await supabaseAdmin.from('activity_logs').insert({
      case_id: parseInt(caseId),
      actor_id: user.id,
      action_type: 'task_created',
      description: `タスク「${body.title}」を作成しました`,
      target_type: 'task',
      target_id: task.id,
      target_value: body.title,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    console.error('Create task error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
