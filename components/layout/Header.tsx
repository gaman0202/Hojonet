'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { LogOutIcon } from '@/components/icons';

export default function Header() {
  const { profile, userName, companyName, isLoggedIn, loading } = useProfile();
  const displayName = isLoggedIn ? (userName || '') : '';
  const displayCompany = isLoggedIn ? (companyName || '') : '';
  const userInitial = displayName ? displayName.trim().charAt(0) : 'ゲスト'.charAt(0);
  const userType = profile?.user_type;

  const profileHref =
    userType === 'expert' || userType === 'assistant'
      ? '/expert/settings'
      : userType === 'admin'
        ? '/admin/settings'
        : '/dashboard/profile';

  return (
    <header className="w-full max-w-[1440px] mx-auto flex flex-row items-center justify-between px-3 sm:px-8 lg:px-20 py-2 sm:py-3 bg-white gap-1 sm:gap-2">
      {/* Left side - Logo */}
      <div className="flex items-center flex-shrink-0">
        <Link href="/" className="text-lg sm:text-2xl lg:text-[32px] font-black leading-[140%] tracking-[-0.31px] text-black whitespace-nowrap" style={{ fontFamily: 'var(--font-family-logo)' }}>
          補助NET
        </Link>
      </div>

      {/* Right side - ロード完了まで非表示、完了後にログイン/会員登録 or ユーザー+ログアウト */}
      <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0 justify-end flex-shrink-0">
        {loading ? null : !isLoggedIn ? (
          <>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.15px] text-[#364153] hover:text-[#155DFC] transition-colors whitespace-nowrap"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-[#155DFC] text-white text-xs sm:text-sm font-normal leading-5 rounded-[10px] hover:bg-[#1346c7] transition-colors whitespace-nowrap"
            >
              会員登録
            </Link>
          </>
        ) : (
          <>
            <Link
              href={profileHref}
              className="flex flex-row items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-[999px] hover:bg-[#F3F4F6] transition-colors"
              aria-label="プロフィール設定へ移動"
            >
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#DBEAFE] rounded-full flex-shrink-0">
                <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#155DFC]">
                  {userInitial}
                </span>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-xs sm:text-sm font-normal leading-4 sm:leading-5 tracking-[-0.150391px] text-[#0A0A0A] truncate max-w-[100px] sm:max-w-[120px]">
                  {displayName || 'ゲスト'}
                </span>
                {displayCompany ? (
                  <span className="hidden sm:block text-xs font-normal leading-4 text-[#6A7282] truncate max-w-[120px]">
                    {displayCompany}
                  </span>
                ) : null}
              </div>
            </Link>
            <Link
              href="/logout"
              className="flex flex-row items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-normal leading-4 sm:leading-5 tracking-[-0.15px] text-[#364153] hover:text-[#155DFC] hover:bg-[#F3F4F6] rounded-[10px] transition-colors flex-shrink-0"
              aria-label="ログアウト"
            >
              <LogOutIcon size={16} color="currentColor" className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">ログアウト</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
