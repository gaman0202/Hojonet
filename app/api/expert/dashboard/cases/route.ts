// app/api/expert/dashboard/cases/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * GET: 전문가 대시보드용 case 목록 조회
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    const groupId = profile?.group_id ?? profile?.id ?? user.id;

    // 전문가가 참여한 보조금 ID 조회
    const { data: subsidyConfigs } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('subsidy_id')
      .eq('expert_id', user.id);

    const subsidyIds = [...new Set((subsidyConfigs || []).map(c => c.subsidy_id).filter(Boolean))];

    // 전문가가 담당하는 case 조회
    // 1. expert_group_id가 설정된 case
    // 2. expert_group_id가 null이고 전문가가 참여한 보조금의 case
    let allCases: any[] = [];

    // expert_group_id가 설정된 case
    const { data: assignedCases, error: assignedError } = await supabaseAdmin
      .from('cases')
      .select(`
        id,
        title,
        status,
        deadline,
        unread_message_count,
        urgent_task_count,
        expert_group_id,
        subsidy_id
      `)
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id}`)
      .neq('status', 'rejected')
      .order('updated_at', { ascending: false });

    if (assignedError) {
      console.error('Assigned cases fetch error:', assignedError);
    } else {
      allCases = assignedCases || [];
    }

    // expert_group_id가 null이고 전문가가 참여한 보조금의 case（メッセージ・予定用。進行中件数には含めない）
    if (subsidyIds.length > 0) {
      const { data: unassignedCases, error: unassignedError } = await supabaseAdmin
        .from('cases')
        .select(`
          id,
          title,
          status,
          deadline,
          unread_message_count,
          urgent_task_count,
          expert_group_id,
          subsidy_id
        `)
        .is('expert_group_id', null)
        .in('subsidy_id', subsidyIds)
        .neq('status', 'rejected')
        .order('updated_at', { ascending: false });

      if (unassignedError) {
        console.error('Unassigned cases fetch error:', unassignedError);
      } else {
        // 중복 제거 (id 기준)
        const existingIds = new Set(allCases.map(c => c.id));
        const newCases = (unassignedCases || []).filter(c => !existingIds.has(c.id));
        allCases = [...allCases, ...newCases];
      }
    }

    return NextResponse.json({ cases: allCases });
  } catch (e) {
    console.error('Dashboard cases API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
