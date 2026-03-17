import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BUCKET_CASE_DOCS = 'case-documents';
const BUCKET_TASK_FILES = 'task-files';
const TASK_FILES_PREFIX = 'task-files/';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xml': 'text/xml',
  '.json': 'application/json',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
};

function getMimeType(fileName: string, fallback: string): string {
  const ext = fileName.lastIndexOf('.') >= 0 ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  return MIME_TYPES[ext] || fallback || 'application/octet-stream';
}

const INLINE_PREVIEWABLE = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  'text/plain', 'text/csv', 'text/html', 'text/xml',
]);

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

/** GET: インラインプレビュー用（Content-Disposition: inline） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; docId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId, docId } = await params;

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, case_id, file_path, file_name')
      .eq('id', docId)
      .eq('case_id', caseId)
      .single();

    if (docError || !doc || !doc.file_path) {
      return NextResponse.json({ error: '書類またはファイルが見つかりません。' }, { status: 404 });
    }

    const { data: caseData } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id, user_group_id')
      .eq('id', caseId)
      .single();

    if (!caseData) return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const userType = profile.user_type ?? '';
    let hasAccess: boolean;
    if (userType === 'member' || userType === 'introducer') {
      const { data: memberRow } = await supabaseAdmin
        .from('case_members')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .maybeSingle();
      hasAccess = !!memberRow;
    } else {
      const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
      hasAccess =
        profile.group_id === caseData.expert_group_id ||
        profile.group_id === caseData.user_group_id ||
        profile.id === caseData.user_group_id ||
        (caseData.expert_group_id == null && isExpertRole);
    }

    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const isTaskFile = doc.file_path.startsWith(TASK_FILES_PREFIX);
    const bucket = isTaskFile ? BUCKET_TASK_FILES : BUCKET_CASE_DOCS;
    const storagePath = isTaskFile ? doc.file_path.slice(TASK_FILES_PREFIX.length) : doc.file_path;

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(storagePath);

    if (downloadError || !blob) {
      return NextResponse.json({ error: 'ダウンロードできません。' }, { status: 500 });
    }

    const fileName = (doc.file_name && doc.file_name.trim()) || 'preview';
    const safeName = fileName.replace(/[^\w\s.-]/g, '_').trim() || 'preview';
    const encoded = encodeURIComponent(fileName);
    const contentType = getMimeType(fileName, blob.type);

    if (!INLINE_PREVIEWABLE.has(contentType)) {
      return NextResponse.json(
        { error: 'この形式はプレビューに対応していません。ダウンロードボタンをご利用ください。' },
        { status: 415 }
      );
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Disposition': `inline; filename="${safeName}"; filename*=UTF-8''${encoded}`,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (e) {
    console.error('Preview document error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
