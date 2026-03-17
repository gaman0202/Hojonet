'use client';

import { useState, useEffect } from 'react';
// Force rebuild to clear cache
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import {
  GridIcon,
  SearchIcon,
  BarChartIcon,
  UsersIcon,
  DocumentIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
  XIcon,
  MobileMenuIcon,
  ListIcon,
  TableIcon,
} from '@/components/icons';

type ActiveItem = 'dashboard' | 'search' | 'management' | 'customers' | 'introducers' | 'templates' | 'settings';

interface ExpertSidebarProps {
  activeItem?: ActiveItem;
}

// Global state for mobile menu (shared across all instances)
let mobileMenuState = false;
let mobileMenuListeners: Set<(open: boolean) => void> = new Set();

function setMobileMenuOpen(open: boolean) {
  mobileMenuState = open;
  mobileMenuListeners.forEach((listener) => listener(open));
}

function subscribeMobileMenu(listener: (open: boolean) => void) {
  mobileMenuListeners.add(listener);
  return () => {
    mobileMenuListeners.delete(listener);
  };
}

// MobileMenuButton component - to be used in page headers
export function MobileMenuButton() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpenState] = useState(mobileMenuState);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return true; // Default to mobile on SSR
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMobileMenu((open) => {
      setIsMobileMenuOpenState(open);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleClick = () => {
    setMobileMenuOpen(true);
  };

  if (!mounted || !isMobile || isMobileMenuOpen) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center w-10 h-10 bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm flex-shrink-0 z-50"
      aria-label="メニューを開く"
    >
      <MobileMenuIcon size={20} color="#364153" className="currentColor" />
    </button>
  );
}

export default function ExpertSidebar({ activeItem = 'dashboard' }: ExpertSidebarProps) {
  const pathname = usePathname();
  const { userName } = useProfile();
  const [isCustomersOpen, setIsCustomersOpen] = useState(true); // Default open when customers is active
  const [isMobileMenuOpen, setIsMobileMenuOpenState] = useState(mobileMenuState);

  // Subscribe to global mobile menu state changes
  useEffect(() => {
    // Initial sync
    setIsMobileMenuOpenState(mobileMenuState);
    
    const unsubscribe = subscribeMobileMenu((open) => {
      setIsMobileMenuOpenState(open);
    });
    return unsubscribe;
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const isActive = (item: ActiveItem) => {
    if (activeItem) {
      return activeItem === item;
    }
    // Fallback to pathname matching
    const pathMap: Record<ActiveItem, string> = {
      dashboard: '/expert/dashboard',
      search: '/expert/search',
      management: '/expert/management',
      customers: '/expert/customers',
      introducers: '/expert/introducers',
      templates: '/expert/templates',
      settings: '/expert/settings',
    };
    return pathname === pathMap[item] || pathname?.startsWith(pathMap[item] || '');
  };

  const customersActive = isActive('customers') || isActive('introducers');

  const menuItemsBeforeCustomers = [
    { key: 'dashboard' as ActiveItem, label: 'ダッシュボード', icon: GridIcon, href: '/expert/dashboard' },
    { key: 'search' as ActiveItem, label: '案件検索', icon: SearchIcon, href: '/expert/search' },
    { key: 'management' as ActiveItem, label: '案件管理', icon: BarChartIcon, href: '/expert/management' },
  ];

  const menuItemsAfterCustomers = [
    { key: 'templates' as ActiveItem, label: 'テンプレート', icon: DocumentIcon, href: '/expert/templates' },
    { key: 'settings' as ActiveItem, label: '設定', icon: SettingsIcon, href: '/expert/settings' },
  ];

  const customerSubItems = [
    { key: 'customers' as ActiveItem, label: '顧客管理', href: '/expert/customers', icon: ListIcon },
    { key: 'introducers' as ActiveItem, label: '紹介者管理', href: '/expert/introducers', icon: TableIcon },
  ];

  // Menu content component to avoid duplication
  const MenuContent = ({ onLinkClick, showHeader = true }: { onLinkClick?: () => void; showHeader?: boolean }) => (
    <>
      {/* Header - Only show on desktop */}
      {showHeader && (
        <div className="flex flex-col items-start px-6 py-6 gap-1 border-b border-[#E5E7EB]">
          <h1 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA]">
            補助金サポートシステム
          </h1>
          <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
            専門家モード
          </p>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex flex-col items-start px-4 py-4 gap-2 flex-grow overflow-y-auto">
        {/* Menu Items Before Customers */}
        {menuItemsBeforeCustomers.map((item) => {
          const IconComponent = item.icon;
          const itemActive = isActive(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onLinkClick}
              className={`flex flex-row items-center px-4 gap-3 w-full h-12 rounded-[10px] transition-colors ${
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

        {/* Customers Menu with Dropdown */}
        <div className="flex flex-col items-start w-full">
          {/* Main Customers Button */}
          <button
            onClick={() => setIsCustomersOpen(!isCustomersOpen)}
            className={`flex flex-row items-center justify-between px-4 gap-3 w-full h-12 rounded-[10px] transition-colors ${
              customersActive
                ? 'bg-[#FAF5FF]'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-row items-center gap-3">
              <UsersIcon size={20} color={customersActive ? '#9810FA' : '#364153'} />
              <span className={`text-base leading-6 tracking-[-0.3125px] ${
                customersActive ? 'text-[#9810FA]' : 'text-[#364153]'
              }`}>
                顧客管理
              </span>
            </div>
            <ChevronDownIcon
              size={16}
              color={customersActive ? '#9810FA' : '#364153'}
              className={`transition-transform ${isCustomersOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Submenu */}
          {isCustomersOpen && (
            <div className="flex flex-col items-start w-full mt-1 gap-1 pl-4">
              {customerSubItems.map((subItem) => {
                const IconComponent = subItem.icon;
                const subActive = isActive(subItem.key);
                return (
                  <Link
                    key={subItem.key}
                    href={subItem.href}
                    onClick={onLinkClick}
                    className={`flex flex-row items-center px-4 gap-3 w-full h-10 rounded-[10px] transition-colors ${
                      subActive
                        ? 'bg-[#F3E8FF]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent size={16} color={subActive ? '#9810FA' : '#364153'} />
                    <span className={`text-sm leading-5 tracking-[-0.150391px] ${
                      subActive ? 'text-[#9810FA]' : 'text-[#4A5565]'
                    }`}>
                      {subItem.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu Items After Customers */}
        {menuItemsAfterCustomers.map((item) => {
          const IconComponent = item.icon;
          const itemActive = isActive(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onLinkClick}
              className={`flex flex-row items-center px-4 gap-3 w-full h-12 rounded-[10px] transition-colors ${
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
      <div className="flex flex-col items-start px-4 py-4 gap-2 border-t border-[#E5E7EB]">
        <Link
          href="/expert/settings"
          onClick={onLinkClick}
          className="flex flex-row items-center px-4 gap-3 w-full h-16 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-[#F3E8FF] rounded-full flex-shrink-0">
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA]">
              {userName ? userName.charAt(0) : '?'}
            </span>
          </div>
          <div className="flex flex-col gap-0 flex-grow min-w-0">
            <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#0A0A0A] truncate">
              {userName}
            </p>
            <p className="text-xs font-normal leading-4 text-[#6A7282]">
              専門家
            </p>
          </div>
        </Link>
        <Link
          href="/expert/logout"
          onClick={onLinkClick}
          className="flex flex-row items-center px-4 gap-2 w-full h-9 rounded-[10px] hover:bg-gray-50 transition-colors"
        >
          <LogOutIcon size={16} color="#4A5565" />
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
            ログアウト
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setMobileMenuOpen(false);
              setIsMobileMenuOpenState(false);
            }}
          />
          <div className="lg:hidden fixed top-0 left-0 h-full w-[280px] bg-white border-r border-[#E5E7EB] z-50 flex flex-col shadow-xl">
            {/* Mobile Header with Close Button */}
            <div className="flex flex-row items-center justify-between px-4 py-4 border-b border-[#E5E7EB]">
              <div className="flex flex-col gap-1">
                <h1 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA]">
                  補助金サポートシステム
                </h1>
                <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
                  専門家モード
                </p>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsMobileMenuOpenState(false);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-[10px] hover:bg-gray-50 transition-colors"
                aria-label="メニューを閉じる"
              >
                <XIcon size={20} color="#364153" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MenuContent 
                onLinkClick={() => {
                  setMobileMenuOpen(false);
                  setIsMobileMenuOpenState(false);
                }} 
                showHeader={false} 
              />
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar - Fixed, shows on lg and above */}
      <div className="hidden lg:flex flex-col fixed left-0 top-0 w-[255px] h-screen bg-white border-r border-[#E5E7EB] z-30">
        <MenuContent />
      </div>
    </>
  );
}
