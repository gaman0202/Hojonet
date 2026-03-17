// app/dashboard/page.tsx 

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { createClient } from '@/utils/supabase/client';
import {
  BellIcon,
  ArrowRightIcon,
  HomeIcon,
  DocumentIcon,
  UserIcon,
  LogOutIcon,
} from '@/components/icons';

// Components
import CaseCard from './components/CaseCard';
import TaskCard from './components/TaskCard';

// Types
import { CaseCard as CaseCardType, Task } from './types';

// ステータスの日本語ラベル
const statusLabels: Record<string, string> = {
  consultation: '相談中',
  hearing: 'ヒアリング中',
  doc_prep: '書類準備中',
  review: '審査中',
  submitted: '申請完了',
  accepted: '採択',
  rejected: '不採択',
};

// ステータスに応じたタグを生成
const getStatusTags = (status: string, needsAttention: boolean): string[] => {
  const tags: string[] = [];
  if (needsAttention) tags.push('対応必要');
  tags.push(statusLabels[status] || status);
  return tags;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [cases, setCases] = useState<CaseCardType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    activeCases: 0,
    urgentTasks: 0,
    unreadMessages: 0,
    pendingTasks: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const meRes = await fetch('/api/auth/me');
      const meData = meRes.ok ? await meRes.json() : null;

      if (!meData?.authenticated) {
        setIsLoading(false);
        window.location.href = '/login';
        return;
      }

      const userType = meData.userType ?? meData.profile?.user_type;
      if (userType === 'expert' || userType === 'assistant' || userType === 'admin') {
        window.location.href = '/expert/dashboard';
        return;
      }

      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsLoading(false);
          window.location.href = '/login';
          return;
        }

        const userId = session.user.id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          setUserName(profile.full_name || '');
        }

        // 案件データ取得（API経由: 顧客はグループ単位、紹介者・メンバーは case_members に含まれる案件のみ）
        const casesRes = await fetch('/api/cases');
        const casesJson = casesRes.ok ? await casesRes.json() : { cases: [] };
        const casesData = (casesJson.cases || []) as {
          id: number;
          title: string;
          status: string;
          progress_rate: number;
          amount: string;
          deadline: string;
          needs_attention: boolean;
          unread_message_count: number;
          pending_task_count?: number;
          assignee_name: string;
        }[];

        const formatDeadline = (dateStr: string): string => {
          const deadline = new Date(dateStr);
          const today = new Date();
          const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const formatted = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
          return `${formatted} (${diffDays}日後)`;
        };

        const calculateDaysUntilDeadline = (dateStr: string): number => {
          if (!dateStr) return Infinity;
          const deadline = new Date(dateStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          deadline.setHours(0, 0, 0, 0);
          return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        };

        // 進行中の案件すべて表示（accepted/rejected 以外）、期限が近い順にソート
        const ongoingCases = casesData
          .filter(c => !['accepted', 'rejected'].includes(c.status))
          .sort((a, b) => {
            const daysA = calculateDaysUntilDeadline(a.deadline);
            const daysB = calculateDaysUntilDeadline(b.deadline);
            return daysA - daysB; // 近い期限が上に
          });

        const formattedCases: CaseCardType[] = ongoingCases.map(c => ({
          id: c.id,
          tags: getStatusTags(c.status, c.needs_attention),
          title: c.title,
          deadline: c.deadline ? formatDeadline(c.deadline) : '',
          progress: c.progress_rate || 0,
          amount: c.amount || '',
          assignee: c.assignee_name || '担当者未設定',
          documents: c.pending_task_count ?? 0,
          messages: c.unread_message_count ?? 0,
        }));

        setCases(formattedCases);

        const caseIds = casesData.map(c => c.id);
        if (caseIds.length > 0) {
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(sevenDaysLater.getDate() + 14);

          const { data: tasksData } = await supabase
            .from('tasks')
            .select(`
              id,
              title,
              deadline,
              status,
              priority,
              case_id
            `)
            .in('case_id', caseIds)
            .neq('status', 'approved')
            .lte('deadline', sevenDaysLater.toISOString().split('T')[0])
            .order('deadline', { ascending: true })
            .limit(5);

          const caseTitleMap = new Map(casesData.map(c => [c.id, c.title]));

          const calculateDaysRemaining = (dateStr: string): number => {
            const deadline = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            deadline.setHours(0, 0, 0, 0);
            return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          };

          const formattedTasks: Task[] = (tasksData || []).map(t => ({
            id: t.id,
            title: t.title,
            caseTitle: caseTitleMap.get(t.case_id) || '',
            caseId: t.case_id,
            daysRemaining: t.deadline ? calculateDaysRemaining(t.deadline) : 0,
          }));

          setTasks(formattedTasks);

          const urgentTaskCount = (tasksData || []).filter(t =>
            t.deadline && calculateDaysRemaining(t.deadline) <= 3
          ).length;

          setStats({
            activeCases: casesData.filter(c => !['accepted', 'rejected'].includes(c.status)).length,
            urgentTasks: urgentTaskCount,
            unreadMessages: casesData.reduce((sum, c) => sum + (c.unread_message_count || 0), 0),
            pendingTasks: casesData.reduce((sum, c) => sum + (c.pending_task_count || 0), 0),
          });
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // 日付フォーマット
  const formatDeadline = (dateStr: string): string => {
    const deadline = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
    return `${formatted} (${diffDays}日後)`;
  };

  // 残り日数計算
  const calculateDaysRemaining = (dateStr: string): number => {
    const deadline = new Date(dateStr);
    const today = new Date();
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // アナウンスメント生成
  const announcements = [
    ...(stats.activeCases > 0 && cases.some(c => c.tags.includes('対応必要')) 
      ? [{ icon: 'case', text: `${cases.filter(c => c.tags.includes('対応必要')).length}件の案件で対応が必要です` }]
      : []),
    ...(stats.urgentTasks > 0 
      ? [{ icon: 'clock', text: `期限が迫っているタスクが${stats.urgentTasks}件あります` }]
      : []),
    ...(stats.unreadMessages > 0 
      ? [{ icon: 'message', text: `未読メッセージが${stats.unreadMessages}件あります` }]
      : []),
  ];

  // Overview cards
  const overviewCards = [
    {
      title: '進行中の案件',
      value: String(stats.activeCases),
      description: '現在申請中の補助金',
      iconBg: '#EFF6FF',
      iconColor: '#155DFC',
      valueColor: '#155DFC',
    },
    {
      title: '緊急タスク',
      value: String(stats.urgentTasks),
      description: '期限が迫っています',
      iconBg: '#FEF2F2',
      iconColor: '#E7000B',
      valueColor: '#E7000B',
    },
  ];

  // アイコン関数
  const getAnnouncementIcon = (icon: string) => {
    switch (icon) {
      case 'case':
        return <img src="/icons/exclamation.svg" alt="対応必要" className="w-5 h-5 lg:w-5 lg:h-5" />;
      case 'message':
        return <img src="/icons/message.svg" alt="message" className="w-5 h-5 lg:w-5 lg:h-5" />;
      case 'clock':
        return <img src="/icons/clocknoback.svg" alt="clock" className="w-5 h-5 lg:w-5 lg:h-5" />;
      default:
        return null;
    }
  };

  const getOverviewIconSrc = (title: string) => {
    if (title.includes('進行中')) return '/icons/bag.svg';
    if (title.includes('緊急')) return '/icons/clock.svg';
    if (title.includes('対応必要') || title.includes('対応が必要')) return '/icons/exclamation.svg';
    if (title.includes('進歩') || title.includes('進捗')) return '/icons/paper.svg';
    return '/icons/paper.svg';
  };

  if (isLoading) {
    return (
      <div className="flex flex-row min-h-screen bg-white lg:bg-white bg-[#F9FAFB]">
        <Sidebar activeItem="home" />
        <main className="flex items-center justify-center flex-grow">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#155DFC]"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-row min-h-screen bg-white lg:bg-white bg-[#F9FAFB]">
      <Sidebar activeItem="home" />

      {/* Main Content */}
      <main className="flex flex-col items-start px-4 lg:px-12 pt-6 lg:py-12 pb-24 lg:pb-12 gap-6 lg:gap-6 flex-grow min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 lg:gap-2 w-full pb-4 lg:pb-0 border-b border-[#E5E7EB] lg:border-none">
          <h1 className="text-2xl lg:text-[30px] font-medium leading-8 lg:leading-[36px] tracking-[0.0703125px] lg:tracking-[0.395508px] text-[#101828]">
            ダッシュボード
          </h1>
          <p className="text-sm lg:text-base text-[#4A5565] leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px]">
            進行中の補助金申請状況と重要なお知らせを確認してください
          </p>
        </div>

        {/* Important Announcements - 表示するものがある場合のみ */}
        {announcements.length > 0 && (
          <div className="flex flex-col items-start px-5 lg:px-7 py-4 lg:py-4 gap-3 lg:gap-3 w-full min-h-[148px] lg:min-h-[100px] bg-[#FEF2F2] border-l-[3.97px] lg:border-l-4 border-[#E7000B] rounded-[10px]">
            <div className="flex flex-row justify-center items-center gap-2 lg:gap-1">
              <BellIcon size={24} color="#E7000B" />
              <h3 className="text-lg lg:text-lg font-medium leading-7 lg:leading-[140%] tracking-[-0.439453px] text-[#E7000B]">
                重要なお知らせ
              </h3>
            </div>

            <div className="flex flex-col gap-2 lg:gap-1 pl-7 lg:pl-7">
              {announcements.map((announcement, idx) => (
                <div key={idx} className="flex flex-row items-center gap-2 lg:gap-2">
                  {getAnnouncementIcon(announcement.icon)}
                  <span className="text-sm lg:text-base text-[#E7000B] leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px]">
                    {announcement.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:flex lg:flex-row gap-4 lg:gap-6 w-full">
          {overviewCards.map((card, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 pt-4 pb-6 lg:p-6 gap-2 lg:gap-3 w-full lg:flex-1 lg:h-[128px] bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]"
            >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center w-full gap-2 lg:gap-0">
                <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-3 w-full lg:w-auto">
                  <img
                    src={getOverviewIconSrc(card.title)}
                    alt={card.title}
                    className="w-10 h-10 lg:w-11 lg:h-11"
                  />
                  <span className="text-sm lg:text-base font-medium text-[#101828] leading-5 lg:leading-6 tracking-[-0.3125px]">
                    {card.title}
                  </span>
                </div>

                <span
                  className="hidden lg:block text-[30px] font-normal leading-[36px] tracking-[0.395508px]"
                  style={{ color: card.valueColor }}
                >
                  {card.value}
                </span>
              </div>

              <span
                className="lg:hidden text-[30px] font-semibold leading-9 tracking-[0.395508px]"
                style={{ color: card.valueColor }}
              >
                {card.value}
              </span>

              <p className="text-xs lg:text-sm text-[#6A7282] leading-4 lg:leading-5 tracking-[-0.150391px]">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Ongoing Cases Section */}
        <div className="flex flex-col gap-4 lg:gap-4 w-full">
          <div className="flex flex-row justify-between items-center w-full">
            <h2 className="text-lg font-medium leading-7 tracking-[-0.439453px] text-[#101828] lg:text-2xl lg:leading-8 lg:tracking-[0.0703125px]">
              進行中の案件
            </h2>
            <Link
              href="/dashboard/cases"
              className="flex flex-row items-center gap-1 text-sm font-medium text-[#155DFC] leading-5 tracking-[-0.150391px] hover:underline lg:text-base lg:font-normal lg:leading-6 lg:tracking-[-0.3125px]"
            >
              <span>すべて見る</span>
              <ArrowRightIcon size={16} color="#155DFC" />
            </Link>
          </div>

          {cases.length > 0 ? (
            <div className="flex flex-col gap-4 lg:gap-3 w-full">
              {cases.slice(0, 3).map((caseData) => (
                <CaseCard key={caseData.id} caseData={caseData} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-white border border-[#E5E7EB] rounded-[10px]">
              <p className="text-[#6A7282]">進行中の案件はありません</p>
            </div>
          )}
        </div>

        {/* Urgent Tasks Section */}
        <div className="flex flex-col gap-4 lg:gap-4 w-full">
          <div className="flex flex-row justify-between items-center w-full">
            <h2 className="text-lg lg:text-2xl font-medium leading-7 lg:leading-8 tracking-[-0.439453px] lg:tracking-[0.0703125px] text-[#101828]">
              期限が迫っているタスク
            </h2>
            <Link
              href="/dashboard/cases"
              className="flex flex-row items-center gap-1 text-sm lg:text-base font-medium lg:font-normal text-[#155DFC] leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] hover:underline"
            >
              <span>すべて見る</span>
              <ArrowRightIcon size={16} color="#155DFC" />
            </Link>
          </div>

          {tasks.length > 0 ? (
            <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
              {tasks.map((task, idx) => (
                <TaskCard key={task.id} task={task} isLast={idx === tasks.length - 1} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-white border border-[#E5E7EB] rounded-[10px]">
              <p className="text-[#6A7282]">期限が迫っているタスクはありません</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <HomeIcon size={20} color="#155DFC" />
          <span className="text-xs text-[#155DFC] leading-4">ホーム</span>
        </Link>

        <Link href="/dashboard/cases" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <DocumentIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">案件</span>
        </Link>

        <Link href="/dashboard/profile" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <UserIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">マイページ</span>
        </Link>

        <Link href="/logout" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <LogOutIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ログアウト</span>
        </Link>
      </nav>
    </div>
  );
}
