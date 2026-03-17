import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 新規案件（相談申込直後）の初期値: 事前確認が進行中、他は進行前
const DEFAULT_STEPS = [
  { step_order: 1, title: '事前確認', subtitle: '条件チェック', status: 'in_progress' as const },
  { step_order: 2, title: '事前書類収集', subtitle: '申請書初案作成', status: 'pending' as const },
  { step_order: 3, title: '申請手続き', subtitle: '電子申請完了', status: 'pending' as const },
  { step_order: 4, title: '交付決定', subtitle: '通知確認', status: 'pending' as const },
  { step_order: 5, title: '実績報告', subtitle: '支出証明提出', status: 'pending' as const },
  { step_order: 6, title: '補助金請求', subtitle: '入金確認', status: 'pending' as const },
];

/**
 * ステップの順序とステータスからケースのステータスを決定
 * step_order 1: hearing (ヒアリング中) - 事前確認
 * step_order 2: doc_prep (書類準備中) - 事前書類収集
 * step_order 3: 
 *   - in_progress → doc_prep (書類準備中) - 申請手続き 진행中
 *   - completed → submitted (申請完了) - 申請手続き完了
 * step_order 4: 
 *   - in_progress → review (審査中) - 交付決定 진행中
 *   - completed → accepted (交付決定) - 交付決定完了
 * step_order 5-6: submitted (申請完了) - 実績報告、補助金請求
 */
function getCaseStatusFromStepOrder(stepOrder: number, stepStatus?: string): string {
  if (stepOrder === 1) {
    return 'hearing'; // ヒアリング中 (事前確認)
  } else if (stepOrder === 2) {
    return 'doc_prep'; // 書類準備中 (事前書類収集)
  } else if (stepOrder === 3) {
    // 申請手続き: 進行中は書類準備中、完了時のみ申請完了
    if (stepStatus === 'completed') {
      return 'submitted'; // 申請完了 (申請手続き完了)
    } else {
      return 'doc_prep'; // 書類準備中 (申請手続き進行中)
    }
  } else if (stepOrder === 4) {
    // 交付決定: 進行中は審査中、完了時のみ交付決定
    if (stepStatus === 'completed') {
      return 'accepted'; // 交付決定 (交付決定完了)
    } else {
      return 'review'; // 審査中 (交付決定進行中)
    }
  } else {
    return 'submitted'; // 申請完了 (実績報告、補助金請求)
  }
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as { path?: string });
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

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

/**
 * GET: 案件の進行段階一覧。未作成ならデフォルト6ステップを挿入して返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });

    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const { data: rows, error } = await supabaseAdmin
      .from('case_steps')
      .select('id, step_order, title, subtitle, description, estimated_days, status')
      .eq('case_id', caseIdNum)
      .order('step_order', { ascending: true });

    if (error) {
      console.error('case_steps fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: caseRow } = await supabaseAdmin
      .from('cases')
      .select('subsidy_id')
      .eq('id', caseIdNum)
      .single();

    const subsidyId = caseRow?.subsidy_id;
    type StepInsert = { case_id: number; step_order: number; title: string; subtitle: string; status: string; description?: string | null; estimated_days?: number | null };

    // 補助金に subsidy_steps がある場合はそれを正とする（未作成時 or 既存 case_steps を上書き）
    let subsidySteps: { step_order: number; title: string | null; subtitle: string | null; description?: string | null; estimated_days?: number | null }[] | null = null;
    if (subsidyId) {
      const { data } = await supabaseAdmin
        .from('subsidy_steps')
        .select('step_order, title, subtitle, description, estimated_days')
        .eq('subsidy_id', subsidyId)
        .order('step_order', { ascending: true });
      if (data?.length) subsidySteps = data;
    }

    const shouldSyncFromSubsidy = subsidySteps && subsidySteps.length > 0;
    if (shouldSyncFromSubsidy && subsidySteps) {
      const oldByOrder = new Map((rows ?? []).map((r) => [r.step_order, r.status]));
      const toInsert: StepInsert[] = subsidySteps.map((s, i) => {
        const status = oldByOrder.get(s.step_order) ?? (i === 0 ? 'in_progress' : 'pending');
        return {
          case_id: caseIdNum,
          step_order: s.step_order,
          title: s.title ?? `ステップ${s.step_order}`,
          subtitle: s.subtitle ?? '',
          status,
          description: s.description ?? null,
          estimated_days: s.estimated_days ?? null,
        };
      });

      await supabaseAdmin.from('case_steps').delete().eq('case_id', caseIdNum);

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('case_steps')
        .insert(toInsert)
        .select('id, step_order, title, subtitle, description, estimated_days, status');

      if (insertError) {
        console.error('case_steps insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ steps: inserted ?? toInsert.map((s) => ({ ...s, id: 0 })) });
    }

    if (!rows || rows.length === 0) {
      let toInsert: StepInsert[];
      if (subsidySteps?.length) {
        toInsert = subsidySteps.map((s, i) => ({
          case_id: caseIdNum,
          step_order: s.step_order,
          title: s.title ?? `ステップ${s.step_order}`,
          subtitle: s.subtitle ?? '',
          status: i === 0 ? 'in_progress' : 'pending',
          description: s.description ?? null,
          estimated_days: s.estimated_days ?? null,
        }));
      } else {
        toInsert = DEFAULT_STEPS.map((s) => ({
          case_id: caseIdNum,
          step_order: s.step_order,
          title: s.title,
          subtitle: s.subtitle,
          status: s.status,
        }));
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('case_steps')
        .insert(toInsert)
        .select('id, step_order, title, subtitle, description, estimated_days, status');

      if (insertError) {
        console.error('case_steps insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ steps: inserted ?? toInsert.map((s, i) => ({ ...s, id: 0 })) });
    }

    return NextResponse.json({ steps: rows });
  } catch (e) {
    console.error('Steps GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * PATCH: 指定ステップのステータスを更新。Body: { step_order: number, status: 'pending'|'in_progress'|'completed' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });

    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });

    const body = await request.json();
    const stepOrder = typeof body.step_order === 'number' ? body.step_order : parseInt(String(body.step_order), 10);
    const status = body.status;
    if (isNaN(stepOrder) || stepOrder < 1 || stepOrder > 6) {
      return NextResponse.json({ error: 'ステップ順序が無効です。' }, { status: 400 });
    }
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'ステータスが無効です。' }, { status: 400 });
    }

    const { data: row, error: updateError } = await supabaseAdmin
      .from('case_steps')
      .update({
        status,
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
      })
      .eq('case_id', caseIdNum)
      .eq('step_order', stepOrder)
      .select('id, step_order, title, subtitle, status')
      .single();

    if (updateError) {
      const def = DEFAULT_STEPS[stepOrder - 1];
      const { data: inserted } = await supabaseAdmin
        .from('case_steps')
        .insert({
          case_id: caseIdNum,
          step_order: stepOrder,
          title: def?.title ?? `ステップ${stepOrder}`,
          subtitle: def?.subtitle ?? '',
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .select('id, step_order, title, subtitle, status')
        .single();
      
      // ステップのステータスが変更された場合、ケースのステータスを更新
      if (inserted && (status === 'in_progress' || status === 'completed')) {
        const { data: allSteps } = await supabaseAdmin
          .from('case_steps')
          .select('step_order, status')
          .eq('case_id', caseIdNum)
          .order('step_order', { ascending: false });

        const allCompleted = allSteps && allSteps.length > 0 && allSteps.every((s) => s.status === 'completed');
        let caseStatus: string;
        if (allCompleted) {
          caseStatus = 'accepted'; // 進行段階がすべて完了 → 採択
        } else {
          let inProgressStep: { step_order: number; status: string } | null = null;
          if (allSteps) {
            inProgressStep = allSteps.find(s => s.status === 'in_progress') || null;
          }
          if (inProgressStep) {
            caseStatus = getCaseStatusFromStepOrder(inProgressStep.step_order, inProgressStep.status);
          } else {
            caseStatus = getCaseStatusFromStepOrder(stepOrder, status);
          }
        }

        await supabaseAdmin
          .from('cases')
          .update({ status: caseStatus })
          .eq('id', caseIdNum);
      }
      
      return NextResponse.json({ step: inserted ?? { step_order: stepOrder, status } });
    }

    // ステップのステータスが変更された場合、ケースのステータスを更新
    if (row && (status === 'in_progress' || status === 'completed')) {
      const { data: allSteps } = await supabaseAdmin
        .from('case_steps')
        .select('step_order, status')
        .eq('case_id', caseIdNum)
        .order('step_order', { ascending: false });

      const allCompleted = allSteps && allSteps.length > 0 && allSteps.every((s) => s.status === 'completed');
      let caseStatus: string;
      if (allCompleted) {
        caseStatus = 'accepted'; // 進行段階がすべて完了 → 採択
      } else {
        let inProgressStep: { step_order: number; status: string } | null = null;
        if (allSteps) {
          inProgressStep = allSteps.find(s => s.status === 'in_progress') || null;
        }
        if (inProgressStep) {
          caseStatus = getCaseStatusFromStepOrder(inProgressStep.step_order, inProgressStep.status);
        } else {
          caseStatus = getCaseStatusFromStepOrder(stepOrder, status);
        }
      }

      await supabaseAdmin
        .from('cases')
        .update({ status: caseStatus })
        .eq('id', caseIdNum);
    }

    return NextResponse.json({ step: row });
  } catch (e) {
    console.error('Steps PATCH error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
