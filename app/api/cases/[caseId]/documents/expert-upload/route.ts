import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUploadFile } from '@/lib/uploadValidation';

const BUCKET = 'case-documents';

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

/** POST: 専門家が顧客に共有する書類をアップロード */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;

    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, expert_group_id, user_group_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseData.expert_group_id ||
      profile.id === caseData.expert_group_id ||
      (caseData.expert_group_id == null && isExpertRole);

    if (!hasAccess || !isExpertRole) {
      return NextResponse.json({ error: '顧客向け書類のアップロードは専門家のみ可能です。' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const titleInput = formData.get('title') as string | null;
    const title = (titleInput && titleInput.trim()) || null;

    const validation = validateUploadFile(file ?? { name: '', size: 0 });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const f = file!;

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${caseId}/expert/${crypto.randomUUID()}_${safeName}`;

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

    const sizeKB = Math.round(f.size / 1024);
    const sizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;

    const docTitle = title || f.name;

    const { data: doc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        case_id: parseInt(caseId, 10),
        title: docTitle,
        file_name: f.name,
        file_path: uploadData.path,
        file_size: sizeStr,
        uploader_id: user.id,
        uploaded_at: new Date().toISOString(),
        status: 'approved',
        is_expert_shared: true,
        is_required: false,
        is_new: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Document insert error:', insertError);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // n8n webhook: 専門家書類共有通知
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'expert_document_shared',
          caseId: parseInt(caseId, 10),
          docTitle,
          fileName: f.name,
          uploaderType: 'expert',
          uploadedAt: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.warn('n8n webhook error:', err);
      });
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    console.error('Expert upload error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
