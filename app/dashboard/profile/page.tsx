'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { createClient } from '@/utils/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeftIcon,
  GridIcon,
  MailIcon,
  BuildingIcon,
  LocationIcon,
  PhoneCallIcon,
  EnvelopeIcon,
  FileIcon,
  UsersIcon,
  HomeIcon,
  DocumentIcon,
  UserIcon,
  LogOutIcon,
} from '@/components/icons';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarInitial, setAvatarInitial] = useState<string>('田');
  const [stats, setStats] = useState([
    { value: '0', label: '進行中の案件', color: '#155DFC' },
    { value: '0', label: '採択済み', color: '#00A63E' },
    { value: '0', label: '申請総数', color: '#9810FA' },
    { value: '0%', label: '採択率', color: '#F54900' },
  ]);
  const [statsLoading, setStatsLoading] = useState(true);

  // セッションからメールアドレスを取得
  useEffect(() => {
    const loadEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || profile?.email || '');
    };
    loadEmail();
  }, [profile]);

  // プロフィールデータから表示名とアバターを設定
  useEffect(() => {
    if (profile) {
      const name = profile.full_name || '';
      setDisplayName(name);
      setAvatarInitial(name?.trim()?.[0] || '田');
    }
  }, [profile]);

  // 案件統計を取得（同一グループの案件）
  useEffect(() => {
    if (!profile?.group_id) {
      setStatsLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const supabaseClient = createClient();
        const { data: casesData, error } = await supabaseClient
          .from('cases')
          .select('status')
          .eq('user_group_id', profile.group_id);
        if (error) {
          console.error('Error fetching case stats:', error);
          setStatsLoading(false);
          return;
        }
        const allCases = casesData || [];
        const activeCases = allCases.filter((c: { status: string }) =>
          !['accepted', 'rejected'].includes(c.status)
        ).length;
        const approvedCases = allCases.filter((c: { status: string }) =>
          ['accepted', 'approved'].includes(c.status)
        ).length;
        const totalCases = allCases.length;
        const approvalRate = totalCases > 0 ? Math.round((approvedCases / totalCases) * 100) : 0;
        setStats([
          { value: String(activeCases), label: '進行中の案件', color: '#155DFC' },
          { value: String(approvedCases), label: '採択済み', color: '#00A63E' },
          { value: String(totalCases), label: '申請総数', color: '#9810FA' },
          { value: `${approvalRate}%`, label: '採択率', color: '#F54900' },
        ]);
      } catch (e) {
        console.error('Error fetching stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [profile?.group_id]);

  // プロフィール詳細情報（Mobile/Desktop共通）
  const profileDetails = [
    {
      icon: EnvelopeIcon,
      label: 'メールアドレス',
      value: email,
    },
    {
      icon: PhoneCallIcon,
      label: '連絡先',
      value: profile?.phone || '',
    },
    {
      icon: BuildingIcon,
      label: '会社名',
      value: profile?.company_name || '',
    },
    {
      icon:   FileIcon,
      label: '業種',
      value: profile?.industry || '',
    },
    {
      icon: LocationIcon,
      label: '地域',
      value: profile?.location || '',
    },
    {
      icon: UsersIcon,
      label: '従業員数',
      value: profile?.employees || '',
    },
  ];

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] lg:bg-white">
      <Sidebar activeItem="profile" />

      {/* Main Content */}
      <main className="flex flex-col items-start px-4 lg:px-12 pt-6 lg:py-12 pb-24 lg:pb-12 gap-6 lg:gap-6 flex-grow min-w-0 w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-row justify-between items-center w-full pb-4 border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-2">
            <button
              onClick={() => router.back()}
              className="w-5 h-5 flex items-center justify-center"
            >
              <ArrowLeftIcon size={20} color="#4A5565" />
            </button>
            <h1 className="text-lg font-medium leading-7 tracking-[-0.439453px] text-[#101828]">
              マイページ
            </h1>
          </div>
          <div className="w-10 h-10 flex items-center justify-center bg-[#DBEAFE] rounded-full">
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#155DFC]">
              {avatarInitial}
            </span>
          </div>
        </div>

        {/* Desktop Title */}
        <h1 className="hidden lg:block text-[30px] font-normal leading-[36px] tracking-[0.395508px] text-[#101828]">
          マイページ
        </h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-4 w-full">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center px-4 lg:px-6 py-4 lg:py-4 gap-2 lg:gap-2 bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[10px]"
            >
              {statsLoading ? (
                <div className="w-8 h-8 border-2 border-gray-300 border-t-[#155DFC] rounded-full animate-spin" />
              ) : (
                <p
                  className="text-[30px] font-medium leading-[36px] tracking-[0.395508px] text-center"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              )}
              <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-center text-[#4A5565]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-start px-6 lg:px-6 py-6 lg:py-6 gap-4 lg:gap-3 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[10px]">
          {/* Profile Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full gap-4 lg:gap-6 pb-4 lg:pb-6 border-b border-[#E5E7EB]">
            <div className="flex flex-row items-center gap-4 lg:gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 lg:w-[72px] lg:h-[72px] flex items-center justify-center bg-gradient-to-br from-[#2B7FFF] to-[#155DFC] rounded-full flex-shrink-0">
                <span className="text-2xl lg:text-[30px] font-normal leading-8 lg:leading-[36px] tracking-[0.0703125px] lg:tracking-[0.395508px] text-white">
                  {avatarInitial}
                </span>
              </div>
              {/* Name */}
              <h2 className="text-xl lg:text-2xl font-medium lg:font-medium leading-7 lg:leading-8 tracking-[-0.449219px] lg:tracking-[0.0703125px] text-[#101828]">
                {displayName || 'ユーザー'}
              </h2>
            </div>
            {/* Edit Button */}
            <Link
              href="/dashboard/profile/edit"
              className="w-full lg:w-auto px-4 lg:px-4 py-2 lg:py-2 bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors text-center"
            >
              <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-[#4A5565] lg:text-[#0A0A0A]">
                プロフィール編集
              </span>
            </Link>
          </div>

          {/* Profile Details */}
          {/* Mobile: 縦並び */}
          <div className="flex flex-col lg:hidden gap-4 w-full">
            {profileDetails.map((detail, index) => {
              const IconComponent = detail.icon;
              return (
                <div
                  key={index}
                  className="flex flex-row items-start px-3 py-3 gap-3 bg-[#F9FAFB] rounded-[10px]"
                >
                  <div className="flex-shrink-0">
                    <IconComponent size={20} color="#6A7282" />
                  </div>
                  <div className="flex flex-col gap-1 flex-grow min-w-0">
                    <p className="text-xs font-normal leading-4 text-[#6A7282]">
                      {detail.label}
                    </p>
                    <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] break-words">
                      {detail.value || '-'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: 2列グリッド */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-4 w-full">
            {profileDetails.map((detail, index) => {
              const IconComponent = detail.icon;
              return (
                <div
                  key={index}
                  className="flex flex-row items-start px-3 py-3 gap-3 bg-[#F9FAFB] rounded-[10px]"
                >
                  <div className="flex-shrink-0">
                    <IconComponent size={20} color="#6A7282" />
                  </div>
                  <div className="flex flex-col gap-1 flex-grow min-w-0">
                    <p className="text-xs font-normal leading-4 text-[#6A7282]">
                      {detail.label}
                    </p>
                    <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] break-words">
                      {detail.value || '-'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
        >
          <HomeIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ホーム</span>
        </Link>
        <Link
          href="/dashboard/cases"
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
        >
          <DocumentIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">案件</span>
        </Link>
        <Link
          href="/dashboard/profile"
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
        >
          <UserIcon size={20} color="#155DFC" />
          <span className="text-xs text-[#155DFC] leading-4">マイページ</span>
        </Link>
        <Link href="/logout" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <LogOutIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ログアウト</span>
        </Link>
      </nav>
    </div>
  );
}
