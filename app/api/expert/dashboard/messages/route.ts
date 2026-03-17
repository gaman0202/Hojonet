// app/api/expert/dashboard/messages/route.ts

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
 * GET: 전문가 대시보드용 미독 메시지 목록 조회
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
    let allCases: any[] = [];

    // expert_group_id가 설정된 case
    const { data: assignedCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${user.id}`)
      .neq('status', 'rejected');

    if (assignedCases) {
      allCases = assignedCases;
    }

    // expert_group_id가 null이고 전문가가 참여한 보조금의 case
    if (subsidyIds.length > 0) {
      const { data: unassignedCases } = await supabaseAdmin
        .from('cases')
        .select('id')
        .is('expert_group_id', null)
        .in('subsidy_id', subsidyIds)
        .neq('status', 'rejected');

      if (unassignedCases) {
        const existingIds = new Set(allCases.map(c => c.id));
        const newCases = unassignedCases.filter(c => !existingIds.has(c.id));
        allCases = [...allCases, ...newCases];
      }
    }

    const caseIds = allCases.map(c => c.id);
    if (caseIds.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // 메시지 조회 (전문가가 보낸 메시지 제외)
    const { data: messagesData, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        case_id,
        sender_id,
        content,
        created_at,
        is_system_message
      `)
      .in('case_id', caseIds)
      .neq('sender_id', user.id)
      .eq('is_system_message', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return NextResponse.json({ messages: [] });
    }

    const allMessages = messagesData || [];

    // 既読状態を確認
    const messageIds = allMessages.map(m => m.id);
    let readSet = new Set<number>();
    if (messageIds.length > 0) {
      const { data: readStatus } = await supabaseAdmin
        .from('message_read_status')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);
      readSet = new Set((readStatus || []).map(r => r.message_id));
    }

    // 未読メッセージのみフィルタ
    const unreadMessages = allMessages.filter(m => !readSet.has(m.id)).slice(0, 5);

    if (unreadMessages.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Case title 조회
    const uniqueCaseIds = [...new Set(unreadMessages.map(m => m.case_id))];
    const { data: caseTitles } = await supabaseAdmin
      .from('cases')
      .select('id, title, user_group_id, subsidy_id')
      .in('id', uniqueCaseIds);
    
    if (!caseTitles || caseTitles.length === 0) {
      return NextResponse.json({ messages: [] });
    }
    
    const caseTitleMap = new Map((caseTitles || []).map(c => [c.id, c.title || '案件']));
    const caseSubsidyMap = new Map((caseTitles || []).map(c => [c.id, c.subsidy_id]));

    // 발신자 정보 조회 (sender_id와 user_group_id 모두 확인)
    const senderIds = [...new Set(unreadMessages.map(m => m.sender_id).filter(Boolean))];
    const userGroupIds = [...new Set((caseTitles || []).map(c => c.user_group_id).filter(Boolean))];
    const allUserIds = [...new Set([...senderIds, ...userGroupIds])];

    let senderMap = new Map<string, string>();
    if (allUserIds.length > 0) {
      // sender_id로 직접 조회
      if (senderIds.length > 0) {
        const { data: sendersById } = await supabaseAdmin
          .from('profiles')
          .select('id, group_id, full_name, company_name')
          .in('id', senderIds);
        
        (sendersById || []).forEach(s => {
          const name = s.full_name || s.company_name || '不明';
          senderMap.set(s.id, name);
          if (s.group_id) {
            senderMap.set(s.group_id, name);
          }
        });
      }
      
      // user_group_id로 조회 (id 또는 group_id로 매칭)
      if (userGroupIds.length > 0) {
        // 각 user_group_id에 대해 id 또는 group_id로 조회
        for (const groupId of userGroupIds) {
          const { data: sendersByGroup } = await supabaseAdmin
            .from('profiles')
            .select('id, group_id, full_name, company_name')
            .or(`id.eq.${groupId},group_id.eq.${groupId}`)
            .limit(1);
          
          if (sendersByGroup && sendersByGroup.length > 0) {
            const s = sendersByGroup[0];
            const name = s.full_name || s.company_name || '不明';
            senderMap.set(s.id, name);
            senderMap.set(groupId, name); // user_group_id로도 매핑
            if (s.group_id) {
              senderMap.set(s.group_id, name);
            }
          }
        }
      }
    }

    const formattedMessages = unreadMessages.map(m => {
      // sender_id로 먼저 조회
      let senderName = senderMap.get(m.sender_id || '') || '不明';
      
      // 없으면 case의 user_group_id로 조회
      if (senderName === '不明' && m.case_id) {
        const caseData = caseTitles.find(c => c.id === m.case_id);
        if (caseData?.user_group_id) {
          senderName = senderMap.get(caseData.user_group_id) || '不明';
        }
      }
      
      const caseTitle = caseTitleMap.get(m.case_id) || '案件';
      const createdAt = new Date(m.created_at);
      const timeStr = `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`;
      
      return {
        sender: senderName,
        content: m.content || '',
        case: caseTitle,
        time: timeStr,
        caseId: m.case_id,
        subsidyId: caseSubsidyMap.get(m.case_id) || null,
      };
    });

    return NextResponse.json({ messages: formattedMessages });
  } catch (e) {
    console.error('Dashboard messages API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
