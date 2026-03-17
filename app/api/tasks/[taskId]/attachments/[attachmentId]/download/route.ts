import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BUCKET = 'task-files';

/** ダウンロード時のファイル名を Content-Disposition 用にエスケープ（元のファイル名で保存できるように） */
function contentDispositionFilename(name: string): string {
  const safe = (name || 'download').replace(/[^\w\s.-]/g, '_').trim() || 'download';
  const encoded = encodeURIComponent(name || safe);
  return `attachment; filename="${safe.replace(/"/g, '\\"')}"; filename*=UTF-8''${encoded}`;
}

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

/** GET: タスク添付ファイルのダウンロード用署名付きURLへリダイレクト */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string; attachmentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { taskId, attachmentId } = await params;

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

    const { data: row, error: rowError } = await supabaseAdmin
      .from('task_attachments')
      .select('file_path, file_name')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (rowError || !row?.file_path) {
      return NextResponse.json({ error: '添付ファイルが見つかりません。' }, { status: 404 });
    }

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(row.file_path);

    if (downloadError || !blob) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json({ error: 'ダウンロードできません。' }, { status: 500 });
    }

    const fileName = (row.file_name && row.file_name.trim()) || 'download';
    return new NextResponse(blob, {
      headers: {
        'Content-Disposition': contentDispositionFilename(fileName),
        'Content-Type': blob.type || 'application/octet-stream',
      },
    });
  } catch (e) {
    console.error('Download error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
