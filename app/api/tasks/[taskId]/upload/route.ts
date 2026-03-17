import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUploadFile } from '@/lib/uploadValidation';

const BUCKET = 'task-files';

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

/** POST: タスクにファイルをアップロード */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { taskId } = await params;

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id, case_id, type, title, case:cases!tasks_case_id_fkey(id, expert_group_id, user_group_id)')
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

    const caseInfo = Array.isArray(task.case) 
      ? (task.case[0] as { expert_group_id: string; user_group_id: string } | undefined) || null
      : (task.case as { expert_group_id: string; user_group_id: string } | null);
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseInfo?.expert_group_id ||
      profile.group_id === caseInfo?.user_group_id ||
      profile.id === caseInfo?.user_group_id ||
      (caseInfo?.expert_group_id == null && isExpertRole);
    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const validation = validateUploadFile(file ?? { name: '', size: 0 });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const f = file!;

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${taskId}/${crypto.randomUUID()}_${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, await f.arrayBuffer(), {
        contentType: f.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from('task_attachments')
      .insert({
        task_id: parseInt(taskId, 10),
        file_name: f.name,
        file_path: uploadData.path,
        file_size: f.size,
        uploaded_by: user.id,
      })
      .select('id, file_name, file_path, uploaded_at')
      .single();

    if (insertError) {
      console.error('task_attachments insert error:', insertError);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // タスクでファイルをアップロードした場合は書類タブにも表示されるよう documents に追加
    // （file_upload タイプだけでなく、すべてのタスクで添付ファイル → 書類連携）
    const caseIdRaw = (task as { case_id?: number | string }).case_id;
    const caseId = caseIdRaw != null ? Number(caseIdRaw) : null;
    if (caseId != null && !Number.isNaN(caseId)) {
      const sizeKB = Math.round(f.size / 1024);
      const fileSizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
      const taskTitle = (task as { title?: string }).title;
      const docTitle = taskTitle ? `${taskTitle} - ${f.name}` : f.name;
      const { error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          case_id: caseId,
          task_id: parseInt(taskId, 10),
          title: docTitle,
          file_name: f.name,
          file_path: `task-files/${uploadData.path}`,
          file_size: fileSizeStr,
          status: 'submitted',
          uploader_id: user.id,
          uploaded_at: new Date().toISOString(),
          is_expert_shared: isExpertRole,
        });
      if (docError) {
        console.error('documents insert error (task upload):', docError);
      }
    }

    return NextResponse.json({ attachment: row });
  } catch (e) {
    console.error('Task upload error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
