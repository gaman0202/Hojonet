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

async function checkCaseAccess(userId: string, caseId: string) {
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id, expert_group_id, user_group_id')
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) return { hasAccess: false, caseData: null, profile: null };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();

  if (!profile) return { hasAccess: false, caseData, profile: null };

  const userType = profile.user_type ?? '';
  if (userType === 'member' || userType === 'introducer') {
    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle();
    return { hasAccess: !!memberRow, caseData, profile };
  }

  const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
  const hasAccess =
    profile.group_id === caseData.expert_group_id ||
    profile.group_id === caseData.user_group_id ||
    profile.id === caseData.user_group_id ||
    (caseData.expert_group_id == null && isExpertRole);

  return { hasAccess, caseData, profile };
}

/** GET: 案件の書類一覧を取得 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const { hasAccess } = await checkCaseAccess(user.id, caseId);
    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select('id, case_id, task_id, title, document_type, file_name, file_path, file_size, version, status, is_required, has_template, template_url, feedback, uploader_id, uploaded_at, reviewed_at, reviewer_id, expert_comment, comment_at, commenter_id, category, is_expert_shared, is_new, created_at, updated_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: docs ?? [] });
  } catch (e) {
    console.error('GET documents error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** POST: 書類エントリを作成（専門家のみ） */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const { hasAccess, profile } = await checkCaseAccess(user.id, caseId);
    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile?.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '書類エントリの作成は専門家のみ可能です。' }, { status: 403 });
    }

    const body = await request.json();
    const { title, document_type, is_required, has_template, template_url, category } = body;

    if (!title) {
      return NextResponse.json({ error: 'タイトルは必須です。' }, { status: 400 });
    }

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .insert({
        case_id: parseInt(caseId, 10),
        title,
        document_type: document_type || null,
        is_required: !!is_required,
        has_template: !!has_template,
        template_url: template_url || null,
        category: category || null,
        status: 'not_submitted',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    console.error('POST document error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
