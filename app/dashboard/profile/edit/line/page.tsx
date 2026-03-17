'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeftIcon,
  MailIcon,
  LockIcon,
  ChevronDownIcon,
  HomeIcon,
  DocumentIcon,
  UserIcon,
  LogOutIcon,
} from '@/components/icons';

// Types & Data
import { FormData } from '../types';
import { initialFormData, locations, industries, employeesOptions } from '../data';

export default function ProfileEditLinePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Handle save logic here
    router.push('/dashboard/profile');
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] lg:bg-white">
      <Sidebar activeItem="profile" />

      {/* Main Content */}
      <main className="flex flex-col items-start px-4 lg:px-12 pt-6 lg:py-12 pb-24 lg:pb-12 gap-6 lg:gap-6 flex-grow min-w-0 w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-row items-center gap-2 w-full pb-4 border-b border-[#E5E7EB]">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-5 h-5 flex items-center justify-center"
          >
            <ArrowLeftIcon size={20} color="#4A5565" />
          </button>
          <span className="text-sm font-medium leading-5 tracking-[-0.150391px] text-[#4A5565]">
            マイページに戻る
          </span>
        </div>

        {/* Desktop Back Button */}
        <div className="hidden lg:flex flex-row items-center gap-2 w-full">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="flex flex-row items-center gap-2"
          >
            <ArrowLeftIcon size={20} color="#4A5565" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
              マイページに戻る
            </span>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-[30px] font-normal lg:font-normal leading-8 lg:leading-[36px] tracking-[0.0703125px] lg:tracking-[0.395508px] text-[#101828] w-full">
          プロフィール編集
        </h1>

        {/* Form Container - Figma: padding 32px, gap 24px, max-width 1088px, rounded 16px */}
        <div className="flex flex-col items-center px-4 lg:px-8 py-6 lg:py-8 gap-6 lg:gap-6 w-full max-w-[1088px] bg-white border border-[#E5E7EB] rounded-2xl">
          {/* Form - Figma: flex-wrap, gap 16px, max-width 1024px */}
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-center lg:items-start lg:content-center gap-4 w-full max-w-[1024px]">
            
            {/* Email - Full Width, Disabled (LINE連携) */}
            <div className="flex flex-col gap-2 w-full opacity-40">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                メールアドレス
              </label>
              <div className="relative w-full">
                <MailIcon
                  size={20}
                  color="#99A1AF"
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <div className="w-full h-[50px] pl-12 pr-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] flex items-center gap-2">
                  <span>LINE連携</span>
                </div>
              </div>
            </div>

            {/* Password Confirm and Password - Side by Side, Disabled */}
            <div className="flex flex-col lg:flex-row gap-4 w-full opacity-40">
              <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px]">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  パスワード確認
                </label>
                <div className="relative w-full">
                  <LockIcon
                    size={20}
                    color="#99A1AF"
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <div className="w-full h-[50px] pl-12 pr-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] flex items-center">
                    <span>⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px]">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  パスワード
                </label>
                <div className="relative w-full">
                  <LockIcon
                    size={20}
                    color="#99A1AF"
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <div className="w-full h-[50px] pl-12 pr-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] flex items-center">
                    <span>⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                お名前
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full h-[50px] px-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              />
            </div>

            {/* Business Type */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                事業形態
              </label>
              <input
                type="text"
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="w-full h-[50px] px-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              />
            </div>

            {/* Company Name */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                会社名(事業形態抜き)
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full h-[50px] px-4 py-3 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                所在地
              </label>
              <div className="relative w-full">
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full h-[50px] px-4 py-3 pr-10 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={20}
                  color="#4A5565"
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                業種
              </label>
              <div className="relative w-full">
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full h-[50px] px-4 py-3 pr-10 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={20}
                  color="#4A5565"
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>

            {/* Employees */}
            <div className="flex flex-col gap-2 w-full lg:flex-1 lg:min-w-[400px] lg:max-w-[504px]">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                従業員数
              </label>
              <div className="relative w-full">
                <select
                  value={formData.employees}
                  onChange={(e) => handleInputChange('employees', e.target.value)}
                  className="w-full h-[50px] px-4 py-3 pr-10 text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                >
                  {employeesOptions.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={20}
                  color="#4A5565"
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>

            {/* Save Button - Figma: width 224px, height 48px, centered */}
            <div className="flex justify-center w-full">
              <button
                onClick={handleSave}
                className="flex flex-row justify-center items-center px-20 py-3 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors w-[224px] h-12 gap-2.5"
              >
                <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white text-center">
                  保存する
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <HomeIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ホーム</span>
        </Link>
        <Link href="/dashboard/cases" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <DocumentIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">案件</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
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
