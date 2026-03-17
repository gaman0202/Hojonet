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

/** POST: 書類にファイルをアップロード（ユーザー・専門家両方可） */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string; docId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId, docId } = await params;

    // Verify document belongs to case
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, case_id, title, file_path, status')
      .eq('id', docId)
      .eq('case_id', caseId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: '書類が見つかりません。' }, { status: 404 });
    }

    // Check case access
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
    const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
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
      hasAccess =
        profile.group_id === caseData.expert_group_id ||
        profile.group_id === caseData.user_group_id ||
        profile.id === caseData.user_group_id ||
        (caseData.expert_group_id == null && isExpertRole);
    }

    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const validation = validateUploadFile(file ?? { name: '', size: 0 });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const f = file!;

    // Remove old file if exists
    if (doc.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([doc.file_path]);
    }

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${caseId}/${docId}/${crypto.randomUUID()}_${safeName}`;

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

    // Compute file size string
    const sizeKB = Math.round(f.size / 1024);
    const sizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;

    // Update document record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        file_name: f.name,
        file_path: uploadData.path,
        file_size: sizeStr,
        uploader_id: user.id,
        uploaded_at: new Date().toISOString(),
        status: 'submitted',
        is_new: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select()
      .single();

    if (updateError) {
      console.error('Document update error:', updateError);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 専門家・アシスタントは実名で記録、顧客はシステムとして「顧客が〜」で記録（デザイン準拠）
    const isCustomerSide = !isExpertRole;
    await supabaseAdmin.from('activity_logs').insert({
      case_id: parseInt(caseId, 10),
      actor_id: isCustomerSide ? null : user.id,
      action_type: 'document_uploaded',
      description: isCustomerSide
        ? `顧客が書類「${doc.title ?? f.name}」をアップロードしました`
        : `書類「${doc.title ?? f.name}」をアップロードしました`,
      target_type: 'document',
      target_id: parseInt(docId, 10),
      target_value: doc.title ?? f.name,
    });

    // n8n webhook: 書類アップロード通知（環境変数が設定されている場合のみ）
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document_uploaded',
          caseId: parseInt(caseId, 10),
          docId: parseInt(docId, 10),
          docTitle: doc.title ?? f.name,
          fileName: f.name,
          uploaderType: isExpertRole ? 'expert' : 'customer',
          uploadedAt: new Date().toISOString(),
        }),
      }).catch((err) => {
        // webhook 失敗はログのみ、メイン処理に影響させない
        console.warn('n8n webhook error:', err);
      });
    }

    return NextResponse.json({ document: updated });
  } catch (e) {
    console.error('Upload document error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
