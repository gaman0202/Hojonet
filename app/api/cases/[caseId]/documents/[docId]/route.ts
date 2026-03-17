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

async function checkCaseAccess(userId: string, caseId: number) {
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

/** PATCH: 書類を更新（ステータス変更・フィードバック追加など） */
export async function PATCH(
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
      .select('id, case_id, status')
      .eq('id', docId)
      .eq('case_id', caseId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: '書類が見つかりません。' }, { status: 404 });
    }

    const { hasAccess, profile } = await checkCaseAccess(user.id, parseInt(caseId, 10));
    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile?.user_type ?? '');
    const body = await request.json();

    // Build update object
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Expert-only actions: status change, feedback, review
    if (body.status !== undefined) {
      if (['approved', 'rejected', 'reviewing'].includes(body.status) && !isExpertRole) {
        return NextResponse.json({ error: 'このステータスに変更できるのは専門家のみです。' }, { status: 403 });
      }
      update.status = body.status;
      if (body.status === 'approved' || body.status === 'rejected') {
        update.reviewed_at = new Date().toISOString();
        update.reviewer_id = user.id;
        // 承認・却下時はNEWフラグをクリア
        update.is_new = false;
      }
      if (body.status === 'reviewing') {
        // 検討中に移行時もNEWフラグをクリア（確認済みを示す）
        update.is_new = false;
      }
      if (body.status === 'submitted') {
        update.uploaded_at = new Date().toISOString();
        update.uploader_id = user.id;
      }
    }

    if (body.feedback !== undefined) {
      if (!isExpertRole) {
        return NextResponse.json({ error: 'フィードバックを追加できるのは専門家のみです。' }, { status: 403 });
      }
      update.feedback = body.feedback;
    }

    if (body.expert_comment !== undefined) {
      if (!isExpertRole) {
        return NextResponse.json({ error: 'コメントを追加できるのは専門家のみです。' }, { status: 403 });
      }
      update.expert_comment = body.expert_comment;
      update.comment_at = new Date().toISOString();
      update.commenter_id = user.id;
    }

    // Allow updating title, is_required, etc. by expert
    if (body.title !== undefined && isExpertRole) update.title = body.title;
    if (body.is_required !== undefined && isExpertRole) update.is_required = body.is_required;
    if (body.has_template !== undefined && isExpertRole) update.has_template = body.has_template;
    if (body.template_url !== undefined && isExpertRole) update.template_url = body.template_url;
    // NEWフラグは誰でも解除可能（既読処理）
    if (body.is_new !== undefined) update.is_new = body.is_new;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(update)
      .eq('id', docId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (body.status === 'approved' || body.status === 'rejected') {
      const actionType = body.status === 'approved' ? 'document_approved' : 'document_rejected';
      const desc = body.status === 'approved'
        ? `書類「${(updated as { title?: string }).title ?? docId}」を承認しました`
        : `書類「${(updated as { title?: string }).title ?? docId}」を却下しました`;
      await supabaseAdmin.from('activity_logs').insert({
        case_id: parseInt(caseId, 10),
        actor_id: user.id,
        action_type: actionType,
        description: desc,
        target_type: 'document',
        target_id: parseInt(docId, 10),
        target_value: (updated as { title?: string }).title ?? undefined,
      });
    }

    return NextResponse.json({ document: updated });
  } catch (e) {
    console.error('PATCH document error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** DELETE: 書類を削除（専門家のみ） */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; docId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId, docId } = await params;
    const { hasAccess, profile } = await checkCaseAccess(user.id, parseInt(caseId, 10));
    if (!hasAccess) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile?.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '書類を削除できるのは専門家のみです。' }, { status: 403 });
    }

    // Get file_path to clean up storage
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .eq('id', docId)
      .eq('case_id', caseId)
      .single();

    if (doc?.file_path) {
      await supabaseAdmin.storage.from('case-documents').remove([doc.file_path]);
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', docId)
      .eq('case_id', caseId);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE document error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
