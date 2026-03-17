'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import {
  HomeIcon,
  DocumentIcon,
  UserIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@/components/icons';

interface SidebarProps {
  activeItem?: 'home' | 'cases' | 'profile';
}

export default function Sidebar({ activeItem }: SidebarProps) {
  const pathname = usePathname();
  const { userName, companyName, loading } = useProfile();

  // Determine active item from pathname if not provided
  const isHomeActive = activeItem === 'home' || pathname === '/dashboard';
  const isCasesActive = activeItem === 'cases' || pathname?.startsWith('/dashboard/cases');
  const isProfileActive = activeItem === 'profile' || pathname?.startsWith('/dashboard/profile');

  return (
    <nav className="hidden lg:flex flex-col items-start w-[256px] h-screen bg-white border-r border-[#E5E7EB] flex-shrink-0 sticky top-0">
      <div className="flex flex-col w-[255px] flex-grow overflow-y-auto">
        {/* Back to Service Button */}
        <Link href="/" className="flex flex-row items-center px-4 gap-3 h-[54px] border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors">
          <ArrowLeftIcon size={20} color="#364153" />
          <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px]">サービスに戻る</span>
        </Link>

        {/* Navigation Items */}
        <div className="flex flex-col gap-0">
          {/* Home */}
          <Link
            href="/dashboard"
            className={`flex flex-row items-center px-4 gap-3 h-[52px] rounded-[10px] mx-4 mt-8 transition-colors ${
              isHomeActive
                ? 'bg-[#EFF6FF]'
                : 'hover:bg-gray-50'
            }`}
          >
            <HomeIcon size={20} color={isHomeActive ? '#155DFC' : '#364153'} />
            <span className={`text-base leading-6 tracking-[-0.3125px] ${
              isHomeActive ? 'text-[#155DFC]' : 'text-[#364153]'
            }`}>
              ホーム
            </span>
          </Link>

          {/* Ongoing Cases */}
          <Link
            href="/dashboard/cases"
            className={`flex flex-row items-center px-4 gap-3 h-[52px] rounded-[10px] mx-4 transition-colors ${
              isCasesActive
                ? 'bg-[#EFF6FF]'
                : 'hover:bg-gray-50'
            }`}
          >
            <DocumentIcon size={20} color={isCasesActive ? '#155DFC' : '#364153'} />
            <span className={`text-base leading-6 tracking-[-0.3125px] ${
              isCasesActive ? 'text-[#155DFC]' : 'text-[#364153]'
            }`}>
              進行中の案件
            </span>
          </Link>

          {/* My Page */}
          <Link
            href="/dashboard/profile"
            className={`flex flex-row items-center px-4 gap-3 h-[52px] rounded-[10px] mx-4 transition-colors ${
              isProfileActive
                ? 'bg-[#EFF6FF]'
                : 'hover:bg-gray-50'
            }`}
          >
            <UserIcon size={20} color={isProfileActive ? '#155DFC' : '#364153'} />
            <span className={`text-base leading-6 tracking-[-0.3125px] ${
              isProfileActive ? 'text-[#155DFC]' : 'text-[#364153]'
            }`}>
              マイページ
            </span>
          </Link>
        </div>
      </div>

      {/* User Info Section */}
      <div className="flex flex-col px-4 pt-[17px] pb-4 gap-2 w-[255px] border-t border-[#E5E7EB]">
        {/* User Profile - click to go to My Page */}
        <Link
          href="/dashboard/profile"
          className="flex flex-row items-center px-4 gap-3 h-16 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div className="flex justify-center items-center w-10 h-10 bg-[#DBEAFE] rounded-full flex-shrink-0">
            <span className="text-base text-[#155DFC] leading-6 tracking-[-0.3125px]">
              {userName ? userName.charAt(0) : (loading ? '…' : '?')}
            </span>
          </div>
          {/* User Info */}
          <div className="flex flex-col gap-0 min-w-0">
            <span className="text-sm text-[#0A0A0A] leading-5 tracking-[-0.150391px] truncate">
              {loading && !userName ? '読み込み中...' : userName}
            </span>
            <span className="text-xs text-[#6A7282] leading-4 truncate">
              {loading && !companyName ? '' : companyName}
            </span>
          </div>
        </Link>

        {/* Logout Button */}
        <Link
          href="/logout"
          className="flex flex-row items-center px-4 gap-2 h-9 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          <ArrowRightIcon size={16} color="#4A5565" />
          <span className="text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">ログアウト</span>
        </Link>
      </div>
    </nav>
  );
}
