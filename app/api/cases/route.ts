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
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/**
 * GET: ログインユーザーのグループに紐づく案件一覧を返す
 * assignee の full_name も含む（RLS の制約を受けない supabaseAdmin を使用）
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    // プロフィール取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    const groupId = profile.group_id ?? profile.id;
    const userType = (profile as { user_type?: string }).user_type;

    let cases: { id: number; title: string | null; status: string; amount: string | null; deadline: string | null; progress_rate: number | null; needs_attention: boolean | null; unread_message_count: number | null; urgent_task_count: number | null; assignee_id: string | null; subsidy_id: number | null }[] = [];

    // 紹介者・メンバーは「自分が case_members に含まれる案件」のみ表示
    if (userType === 'member' || userType === 'introducer') {
      const { data: memberRows } = await supabaseAdmin
        .from('case_members')
        .select('case_id')
        .eq('user_id', profile.id);
      const caseIds = [...new Set((memberRows || []).map((r: { case_id: number }) => r.case_id))];
      if (caseIds.length === 0) {
        return NextResponse.json({ cases: [] });
      }
      const { data: casesData, error: casesError } = await supabaseAdmin
        .from('cases')
        .select('id, title, status, amount, deadline, progress_rate, needs_attention, unread_message_count, urgent_task_count, pending_task_count, assignee_id, subsidy_id')
        .in('id', caseIds)
        .neq('status', 'rejected')
        .order('updated_at', { ascending: false });
      if (casesError) {
        console.error('Cases fetch error (member/introducer):', casesError);
        return NextResponse.json({ error: casesError.message }, { status: 500 });
      }
      cases = casesData || [];
    } else {
      // 顧客（申請者）は同一グループの案件を表示
      const { data: casesData, error: casesError } = await supabaseAdmin
        .from('cases')
        .select('id, title, status, amount, deadline, progress_rate, needs_attention, unread_message_count, urgent_task_count, pending_task_count, assignee_id, subsidy_id')
        .eq('user_group_id', groupId)
        .neq('status', 'rejected')
        .order('updated_at', { ascending: false });

      if (casesError) {
        console.error('Cases fetch error:', casesError);
        return NextResponse.json({ error: casesError.message }, { status: 500 });
      }
      cases = casesData || [];
    }

    // 進捗率を計算（모든 case에 대해 최신 진행율 계산）
    const progressMap = new Map<number, number>();
    
    // 모든 case의 태스크를 한 번에 조회
    const caseIds = cases.map(c => c.id);
    let tasksByCaseId = new Map<number, { total: number; approved: number }>();
    
    if (caseIds.length > 0) {
      const { data: allTasks, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .select('id, case_id, status')
        .in('case_id', caseIds);
      
      if (!tasksError && allTasks) {
        // case별로 태스크 집계
        caseIds.forEach(caseId => {
          const caseTasks = allTasks.filter(t => t.case_id === caseId);
          const total = caseTasks.length;
          const approved = caseTasks.filter(t => t.status === 'approved').length;
          tasksByCaseId.set(caseId, { total, approved });
        });
      }
    }
    
    // 병렬로 모든 case의 진행율 계산
    const progressPromises = cases.map(async (caseItem) => {
      try {
        // 먼저 직접 계산 시도
        const taskStats = tasksByCaseId.get(caseItem.id);
        let progress = 0;
        
        if (taskStats && taskStats.total > 0) {
          progress = Math.round((taskStats.approved / taskStats.total) * 100);
        } else {
          // 태스크가 없으면 RPC 함수 시도
          const { data: calculatedProgress, error: rpcError } = await supabaseAdmin.rpc(
            'calculate_case_progress',
            { p_case_id: caseItem.id }
          );
          
          if (!rpcError && calculatedProgress !== null) {
            progress = calculatedProgress;
          }
        }
        
        // 계산된 진행율이 기존 값과 다르면 데이터베이스 업데이트
        if (progress !== (caseItem.progress_rate ?? 0)) {
          await supabaseAdmin
            .from('cases')
            .update({ progress_rate: progress })
            .eq('id', caseItem.id);
        }
        
        return { caseId: caseItem.id, progress };
      } catch (err) {
        console.error(`Progress calculation error for case ${caseItem.id}:`, err);
        return { caseId: caseItem.id, progress: caseItem.progress_rate ?? 0 };
      }
    });
    
    const progressResults = await Promise.all(progressPromises);
    progressResults.forEach(({ caseId, progress }) => {
      progressMap.set(caseId, progress);
    });

    // 補助金タイトル取得
    const subsidyIds = [...new Set(cases.map((c) => c.subsidy_id).filter(Boolean))] as number[];
    let subsidyMap: Map<number, { title?: string; amount_description?: string }> = new Map();
    if (subsidyIds.length > 0) {
      const { data: subsidies } = await supabaseAdmin
        .from('subsidies')
        .select('id, title, amount_description')
        .in('id', subsidyIds);
      subsidyMap = new Map((subsidies || []).map((s: { id: number; title?: string; amount_description?: string }) => [s.id, s]));
    }

    // 担当者名取得
    const assigneeIds = [...new Set(cases.map((c) => c.assignee_id).filter(Boolean))] as string[];
    let assigneeMap: Map<string, string> = new Map();
    if (assigneeIds.length > 0) {
      const { data: assignees } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', assigneeIds);
      assigneeMap = new Map(
        (assignees || []).map((a: { id: string; full_name?: string | null }) => [a.id, a.full_name?.trim() || ''])
      );
    }

    const result = cases.map((c) => {
      const sub = c.subsidy_id ? subsidyMap.get(c.subsidy_id) : null;
      return {
        id: c.id,
        title: c.title || sub?.title || '案件',
        status: c.status,
        amount: c.amount || sub?.amount_description || '',
        deadline: c.deadline || '',
        progress_rate: progressMap.get(c.id) ?? c.progress_rate ?? 0,
        needs_attention: c.needs_attention ?? false,
        unread_message_count: c.unread_message_count || 0,
        urgent_task_count: c.urgent_task_count || 0,
        pending_task_count: (c as { pending_task_count?: number }).pending_task_count ?? 0,
        assignee_name: c.assignee_id ? (assigneeMap.get(c.assignee_id) || '') : '',
      };
    });

    return NextResponse.json({ cases: result });
  } catch (e) {
    console.error('Cases API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
