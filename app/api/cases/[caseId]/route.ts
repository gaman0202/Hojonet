import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const STATUS_LABELS: Record<string, string> = {
  consultation: '相談受付',
  hearing: 'ヒアリング中',
  doc_prep: '書類準備中',
  doc_review: '書類確認中',
  submitted: '申請完了',
  reviewing: '審査中',
  approved: '交付決定',
};

/**
 * GET: 案件の要約（title, amount, deadline 等）を返す
 * supabaseAdmin で取得するため、管理画面で補助金を更新した直後の値が確実に反映される
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (Number.isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(c: { name: string; value: string; options?: object }[]) {
            c.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as { path?: string })
            );
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();
    const userGroupId = profile?.group_id ?? profile?.id ?? user.id;
    const userType = (profile as { user_type?: string } | null)?.user_type;

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select(`
        id,
        user_group_id,
        title,
        amount,
        deadline,
        status,
        needs_attention,
        progress_rate,
        assignee_id,
        subsidy_id,
        expert_group_id
      `)
      .eq('id', caseIdNum)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const c = caseRow as {
      user_group_id?: string | null;
      title?: string | null;
      amount?: string | null;
      deadline?: string | null;
      status?: string | null;
      needs_attention?: boolean | null;
      progress_rate?: number | null;
      assignee_id?: string | null;
      subsidy_id?: number | null;
      expert_group_id?: string | null;
    };

    // 紹介者・メンバーは case_members に含まれる案件のみアクセス可
    if (userType === 'member' || userType === 'introducer') {
      const { data: memberRow } = await supabaseAdmin
        .from('case_members')
        .select('id')
        .eq('case_id', caseIdNum)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!memberRow) {
        return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
      }
    } else {
      const isOwner =
        c.user_group_id === user.id ||
        c.user_group_id === userGroupId ||
        c.user_group_id === profile?.group_id;
      if (!isOwner) {
        return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
      }
    }

    // 却下された案件は一覧に表示されず、直接URLで開いた場合もアクセス不可
    if (c.status === 'rejected') {
      return NextResponse.json(
        { error: 'この案件は却下されました。', code: 'case_rejected' },
        { status: 403 }
      );
    }

    let location = '全国';
    if (c.subsidy_id) {
      const { data: sub } = await supabaseAdmin
        .from('subsidies')
        .select('region_id')
        .eq('id', c.subsidy_id)
        .single();
      if (sub?.region_id) {
        const { data: region } = await supabaseAdmin
          .from('m_regions')
          .select('name')
          .eq('id', (sub as { region_id?: number }).region_id)
          .single();
        location = (region?.name as string) || location;
      }
    }

    let assigneeName = '担当者未定';
    if (c.assignee_id) {
      const { data: assigneeProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', c.assignee_id)
        .maybeSingle();
      assigneeName = (assigneeProfile?.full_name as string)?.trim() || assigneeName;
    } else if (c.expert_group_id) {
      const { data: expertProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .or(`id.eq.${c.expert_group_id},group_id.eq.${c.expert_group_id}`)
        .limit(1)
        .maybeSingle();
      assigneeName = (expertProfile?.full_name as string)?.trim() || assigneeName;
    }

    let customerName = '';
    let companyName = '';
    if (c.user_group_id) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, company_name')
        .eq('group_id', c.user_group_id)
        .limit(1)
        .maybeSingle();
      if (userProfile) {
        customerName = (userProfile.full_name as string) ?? '';
        companyName = (userProfile.company_name as string) ?? '';
      }
    }

    const title = c.title?.trim() || '';
    const amount = c.amount?.trim() || '';
    const deadline = c.deadline ? String(c.deadline) : '';

    return NextResponse.json({
      title: title || '案件',
      status: (STATUS_LABELS[c.status ?? ''] || c.status) ?? '',
      needsAction: c.needs_attention ?? false,
      location,
      deadline,
      assignee: assigneeName,
      amount: amount || '',
      progress: c.progress_rate ?? 0,
      customerName,
      companyName,
    });
  } catch (e) {
    console.error('Cases GET summary error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
