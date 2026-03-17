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

/** GET: タスクの添付ファイル一覧 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { taskId } = await params;

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id, case:cases!tasks_case_id_fkey(id, expert_group_id, user_group_id)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, group_id')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const caseRaw = task.case as { expert_group_id: string; user_group_id: string } | { expert_group_id: string; user_group_id: string }[] | null;
    const caseInfo = Array.isArray(caseRaw) ? caseRaw[0] ?? null : caseRaw;
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      profile.id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);
    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    // 1件のアップロードで task_attachments と documents の両方に保存されているため、
    // 両方を返すと同一ファイルが2回表示される。タスク添付一覧は task_attachments のみ返す。
    const { data: attachments } = await supabaseAdmin
      .from('task_attachments')
      .select('id, file_name, file_path, file_size, uploaded_at, uploaded_by')
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    type AttachmentItem = {
      id: string | number;
      file_name: string;
      file_path: string;
      file_size: number;
      uploaded_at: string;
      source: 'task_attachment' | 'document';
      uploaded_by_me: boolean;
    };
    const list: AttachmentItem[] = (attachments ?? []).map((a) => ({
      id: a.id,
      file_name: a.file_name,
      file_path: a.file_path,
      file_size: typeof a.file_size === 'number' ? a.file_size : 0,
      uploaded_at: a.uploaded_at ?? '',
      source: 'task_attachment' as const,
      uploaded_by_me: a.uploaded_by === user.id,
    }));

    return NextResponse.json({ attachments: list });
  } catch (e) {
    console.error('Task attachments GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
