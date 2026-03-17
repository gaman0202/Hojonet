'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import {
  CheckIcon,
  ClockIcon,
  ChatBubbleIcon,
  DocumentIcon,
  CalendarIcon,
  UserIcon,
} from '@/components/icons';

interface Message {
  sender: string;
  content: string;
  case: string;
  time: string;
  caseId: number;
  subsidyId: number | null;
}

interface ScheduleItem {
  date: string;
  title: string;
  color: string;
  bgColor: string;
  caseId?: number;
  subsidyId?: number;
}

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCases: 0,
    urgentTasks: 0,
    unreadMessages: 0,
    registeredSubsidies: 0,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          router.push('/login');
          return;
        }

        const userId = session.user.id;

        // プロフィール取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, group_id')
          .eq('id', userId)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        const groupId = profile.group_id ?? userId;

        // 専門家が参加した補助金ID取得
        const { data: subsidyConfigs } = await supabase
          .from('expert_subsidy_configs')
          .select('subsidy_id')
          .eq('expert_id', userId);

        const subsidyIds = [...new Set((subsidyConfigs || []).map(c => c.subsidy_id).filter(Boolean))];

        // 専門家が担当する案件一覧取得
        // API를 통해 가져오기 (서버에서 처리)
        let casesData: any[] = [];
        
        try {
          const res = await fetch('/api/expert/dashboard/cases');
          if (res.ok) {
            const data = await res.json();
            casesData = data.cases || [];
          } else {
            console.error('Dashboard cases API error:', res.status);
            // API 실패 시 직접 쿼리
            const { data: directCases } = await supabase
              .from('cases')
              .select(`
                id,
                title,
                status,
                deadline,
                unread_message_count,
                urgent_task_count
              `)
              .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${userId}`)
              .neq('status', 'rejected')
              .order('updated_at', { ascending: false });
            casesData = directCases || [];
          }
        } catch (e) {
          console.error('Dashboard cases fetch error:', e);
          // 에러 발생 시 직접 쿼리
          const { data: directCases } = await supabase
            .from('cases')
            .select(`
              id,
              title,
              status,
              deadline,
              unread_message_count,
              urgent_task_count
            `)
            .or(`expert_group_id.eq.${groupId},expert_group_id.eq.${userId}`)
            .neq('status', 'rejected')
            .order('updated_at', { ascending: false });
          casesData = directCases || [];
        }

        const cases = casesData || [];
        // 進行中の案件＝担当割当済み かつ 登録済み補助金に属する案件のみ（management と同一基準）
        const assignedInRegistered = cases.filter(
          (c: { expert_group_id?: string | null; subsidy_id?: number | null }) =>
            c.expert_group_id != null && c.subsidy_id != null && subsidyIds.includes(c.subsidy_id)
        );
        const activeCases = assignedInRegistered.filter(
          (c: { status?: string }) => !['accepted', 'rejected'].includes(c.status ?? '')
        ).length;
        const totalUnreadMessages = cases.reduce((sum, c) => sum + (c.unread_message_count || 0), 0);
        const totalUrgentTasks = cases.reduce((sum, c) => sum + (c.urgent_task_count || 0), 0);

        // 登録済み補助金数（既に取得した subsidyIds を使用）
        const registeredSubsidies = subsidyIds.length;

        setStats({
          activeCases,
          urgentTasks: totalUrgentTasks,
          unreadMessages: totalUnreadMessages,
          registeredSubsidies,
        });

        // 未読メッセージ取得（API経由）
        try {
          const messagesRes = await fetch('/api/expert/dashboard/messages');
          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            setMessages(messagesData.messages || []);
          } else {
            console.error('Messages API error:', messagesRes.status);
            setMessages([]);
          }
        } catch (e) {
          console.error('Messages fetch error:', e);
          setMessages([]);
        }

        // 今週の予定（案件の締切日から生成）
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const upcomingDeadlines = cases
          .filter(c => c.deadline && new Date(c.deadline) >= today && new Date(c.deadline) <= nextWeek)
          .slice(0, 3)
          .map(c => {
            const deadline = new Date(c.deadline!);
            const month = deadline.getMonth() + 1;
            const date = deadline.getDate();
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            const dayName = dayNames[deadline.getDay()];
            const dateStr = `${month}/${date} (${dayName})`;
            
            return {
              date: dateStr,
              title: c.title || '案件',
              color: '#155DFC',
              bgColor: '#EFF6FF',
              caseId: c.id,
              subsidyId: c.subsidy_id,
            };
          });

        setSchedule(upcomingDeadlines);
      } catch (error) {
        console.error('Expert dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const statsData = [
    {
      icon: CheckIcon,
      value: String(stats.activeCases),
      unit: '件',
      label: '進行中の案件',
      iconBg: '#F3E8FF',
      iconColor: '#9810FA',
      valueColor: '#9810FA',
      href: '/expert/management',
    },
    {
      icon: ClockIcon,
      value: String(stats.urgentTasks),
      unit: '件',
      label: '緊急タスク',
      iconBg: '#FFEDD4',
      iconColor: '#F54900',
      valueColor: '#F54900',
      href: '/expert/management',
    },
    {
      icon: ChatBubbleIcon,
      value: String(stats.unreadMessages),
      unit: '件',
      label: '未読メッセージ',
      iconBg: '#DBEAFE',
      iconColor: '#155DFC',
      valueColor: '#155DFC',
      href: '/expert/management',
    },
    {
      icon: DocumentIcon,
      value: String(stats.registeredSubsidies),
      unit: '件',
      label: '登録済み補助金',
      iconBg: '#DCFCE7',
      iconColor: '#00A63E',
      valueColor: '#00A63E',
      href: '/expert/subsidies',
    },
  ];

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="dashboard" />

      {/* Main Content */}
      <main className="flex flex-col items-start pl-4 pr-4 lg:pl-8 lg:pr-4 pt-8 pb-8 lg:pb-8 gap-8 flex-grow min-w-0 lg:ml-[255px]">
        {/* Title Section */}
        <div className="flex flex-row items-center gap-4 w-full">
          <MobileMenuButton />
          <div className="flex flex-col gap-2">
            <h1 className="text-[30px] font-normal leading-[36px] tracking-[0.395508px] text-[#101828]">
              ダッシュボード
            </h1>
            <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
              本日の業務を確認してください
            </p>
          </div>
        </div>

        {/* Statistics Cards - Figma: 263.25px × 146px, padding 25px 25px 1px, gap 16px, border-radius 14px */}
        {loading ? (
          <div className="flex items-center justify-center w-full py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9810FA]"></div>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Link
                key={index}
                href={stat.href}
                className="flex flex-col items-start px-[25px] pt-[25px] pb-[1px] gap-4 bg-white border border-[#E5E7EB] rounded-[14px] min-h-[146px] hover:shadow-md hover:border-[#D1D5DC] transition-all cursor-pointer"
              >
                {/* Icon + Value Container */}
                <div className="flex flex-row items-center gap-4 w-full h-14">
                  {/* Icon Container - Figma: 56px × 56px, border-radius 14px */}
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-[14px] flex-shrink-0"
                    style={{ background: stat.iconBg }}
                  >
                    <IconComponent size={28} color={stat.iconColor} />
                  </div>
                  {/* Value Container */}
                  <div className="flex flex-row items-end gap-0">
                    {/* Number - Figma: font-size 36px, line-height 40px */}
                    <span
                      className="text-[36px] font-normal leading-[40px] tracking-[0.369141px]"
                      style={{ color: stat.valueColor }}
                    >
                      {stat.value}
                    </span>
                    {/* Unit - Figma: font-size 20px, line-height 28px, positioned at bottom */}
                    <span
                      className="text-[20px] font-normal leading-[28px] tracking-[-0.449219px] mb-[2px]"
                      style={{ color: stat.valueColor }}
                    >
                      {stat.unit}
                    </span>
                  </div>
                </div>
                {/* Label - Figma: font-size 16px, line-height 24px */}
                <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                  {stat.label}
                </h3>
              </Link>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Unread Messages */}
          <div className="flex flex-col gap-4 flex-grow min-w-0">
            <h2 className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#101828]">
              未読メッセージ
            </h2>
            <div className="flex flex-col bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[#6A7282]">
                  <p className="text-sm">未読メッセージがありません</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const href = message.subsidyId && message.caseId
                    ? `/expert/management/${message.subsidyId}/${message.caseId}`
                    : '#';
                  
                  return (
                    <Link
                      key={index}
                      href={href}
                      className={`flex flex-row items-start px-4 py-4 gap-3 hover:bg-[#F9FAFB] transition-colors cursor-pointer ${
                        index < messages.length - 1 ? 'border-b border-[#E5E7EB]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-[#DBEAFE] rounded-full flex-shrink-0">
                        <UserIcon size={20} color="#155DFC" />
                      </div>
                      <div className="flex flex-col gap-1 flex-grow min-w-0">
                        <div className="flex flex-row justify-between items-center w-full">
                          <h4 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                            {message.sender}
                          </h4>
                          <span className="text-xs font-normal leading-4 text-[#6A7282] flex-shrink-0">
                            {message.time}
                          </span>
                        </div>
                        <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] line-clamp-2">
                          {message.content}
                        </p>
                        <p className="text-xs font-normal leading-4 text-[#6A7282]">
                          案件: {message.case}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="flex flex-col gap-4 w-full lg:w-[380px] lg:flex-shrink-0">
            <h2 className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#101828]">
              今週の予定
            </h2>
            <div className="flex flex-col px-6 py-6 gap-4 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex flex-row items-center gap-2">
                <CalendarIcon size={20} color="#4A5565" />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  今週の予定
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {schedule.length === 0 ? (
                  <p className="text-sm text-[#6A7282] py-4">予定がありません</p>
                ) : (
                  schedule.map((item, index) => {
                    const href = item.subsidyId && item.caseId
                      ? `/expert/management/${item.subsidyId}/${item.caseId}`
                      : '/expert/management';
                    return (
                      <Link
                        key={index}
                        href={href}
                        className="relative flex flex-col gap-1 px-5 py-3 rounded-[10px] hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: item.bgColor }}
                      >
                        <div
                          className="absolute left-3 top-5 w-2 h-2 rounded-full"
                          style={{ background: item.color }}
                        ></div>
                        <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] pl-5">
                          {item.date}
                        </p>
                        <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] pl-5">
                          {item.title}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
