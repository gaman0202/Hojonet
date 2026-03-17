import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BUCKET = 'case-documents';

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

/** 案件アクセス権 */
async function checkCaseAccess(caseId: string, userId: string) {
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id, user_group_id, expert_group_id')
    .eq('id', caseId)
    .single();
  if (caseError || !caseData) return { allowed: false as const };
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();
  if (!profile) return { allowed: false as const };
  const userType = profile.user_type ?? '';
  if (userType === 'member' || userType === 'introducer') {
    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle();
    return { allowed: !!memberRow };
  }
  const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
  const hasAccess =
    profile.group_id === caseData.expert_group_id ||
    profile.group_id === caseData.user_group_id ||
    profile.id === caseData.user_group_id ||
    (caseData.expert_group_id == null && isExpertRole);
  return { allowed: hasAccess };
}

/** GET: メッセージ添付ファイルをダウンロード */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; attachmentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId, attachmentId } = await params;
    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const { data: row, error: rowError } = await supabaseAdmin
      .from('message_attachments')
      .select('file_path, file_name, message_id')
      .eq('id', attachmentId)
      .single();

    if (rowError || !row?.file_path) {
      return NextResponse.json({ error: '添付ファイルが見つかりません。' }, { status: 404 });
    }

    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('id, case_id')
      .eq('id', row.message_id)
      .eq('case_id', caseId)
      .single();
    if (!msg) return NextResponse.json({ error: '添付ファイルが見つかりません。' }, { status: 404 });

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
    console.error('Message attachment download error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
