'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import {
  BarChartIcon,
  UsersIcon,
  SettingsIcon,
  ArrowRightIcon,
} from '@/components/icons';

type ActiveItem = 'management' | 'customers' | 'settings';

interface AdminSidebarProps {
  activeItem?: ActiveItem;
}

export default function AdminSidebar({ activeItem }: AdminSidebarProps) {
  const pathname = usePathname();
  const { userName } = useProfile();

  const isActive = (item: ActiveItem) => {
    if (activeItem) {
      return activeItem === item;
    }
    // Fallback to pathname matching
    const pathMap: Record<ActiveItem, string> = {
      management: '/admin/management',
      customers: '/admin/customers',
      settings: '/admin/settings',
    };
    return pathname === pathMap[item] || pathname?.startsWith(pathMap[item] || '');
  };

  const menuItems = [
    { key: 'management' as ActiveItem, label: '案件管理', icon: BarChartIcon, href: '/admin/management' },
    { key: 'customers' as ActiveItem, label: '顧客管理', icon: UsersIcon, href: '/admin/customers' },
    { key: 'settings' as ActiveItem, label: '設定', icon: SettingsIcon, href: '/admin/settings' },
  ];

  const MenuContent = () => (
    <>
      <div className="flex flex-col items-start px-6 py-6 gap-1 border-b border-[#E5E7EB]">
        <h1 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA]">
          補助金サポートシステム
        </h1>
        <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
          管理者モード
        </p>
      </div>

      {/* Navigation Menu */}
      <div className="flex flex-col items-start px-4 py-4 gap-2 flex-grow overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const itemActive = isActive(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-row items-center pl-4 gap-3 w-full h-12 rounded-[10px] transition-colors ${
                itemActive
                  ? 'bg-[#FAF5FF]'
                  : 'hover:bg-gray-50'
              }`}
            >
              <IconComponent size={20} color={itemActive ? '#9810FA' : '#364153'} />
              <span className={`text-base leading-6 tracking-[-0.3125px] ${
                itemActive ? 'text-[#9810FA]' : 'text-[#364153]'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User Profile Section */}
      <div className="flex flex-col items-start px-4 pt-4 pb-4 gap-2 border-t border-[#E5E7EB]">
        {/* User Profile */}
        <Link
          href="/admin/settings"
          className="flex flex-row items-center pl-4 gap-3 w-full h-16 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-[#F3E8FF] rounded-full flex-shrink-0">
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA]">
              {userName ? userName.charAt(0) : '?'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#0A0A0A] truncate">
              {userName}
            </p>
            <p className="text-xs font-normal leading-4 text-[#6A7282]">
              管理者
            </p>
          </div>
        </Link>

        {/* Logout Button */}
        <Link
          href="/logout"
          className="flex flex-row items-center pl-4 gap-2 w-full h-9 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          <ArrowRightIcon size={16} color="#4A5565" className="rotate-180" />
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
            ログアウト
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - shows on lg and above */}
      <div className="hidden lg:flex flex-col w-[256px] h-screen sticky top-0 bg-white border-r border-[#E5E7EB] flex-shrink-0">
        <MenuContent />
      </div>

      {/* Mobile Bottom Navigation - shows on mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center min-h-16 pb-2 bg-white border-t border-[#E5E7EB] z-50">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const itemActive = isActive(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full py-2"
            >
              <IconComponent size={20} color={itemActive ? '#9810FA' : '#6A7282'} />
              <span className={`text-xs leading-4 ${itemActive ? 'text-[#9810FA]' : 'text-[#6A7282]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
