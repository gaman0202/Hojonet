'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { PlusIcon } from '@/components/icons';
import { SubsidyCard } from './components';
import { Subsidy } from './types';

export default function AdminManagementPage() {
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/management');
        if (!res.ok) {
          console.error('Failed to fetch management list:', res.status);
          setSubsidies([]);
          return;
        }
        const data = await res.json();
        setSubsidies(Array.isArray(data.subsidies) ? data.subsidies : []);
      } catch (e) {
        console.error('Error fetching subsidies:', e);
        setSubsidies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="management" />

      {/* Main Content */}
      <main className="flex flex-col items-start w-full min-w-0">
        {/* Header Section */}
        <div className="flex flex-col items-start px-4 sm:px-6 py-4 sm:py-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 w-full">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-[30px] font-normal leading-8 sm:leading-[36px] tracking-[0.395508px] text-[#101828]">
                案件管理
              </h1>
              <p className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                登録補助金 {subsidies.length}件
              </p>
            </div>
            <Link
              href="/admin/management/new"
              className="flex flex-row items-center justify-center px-4 gap-2 h-10 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors whitespace-nowrap w-full sm:w-auto"
            >
              <PlusIcon size={20} color="#FFFFFF" />
              <span>新規補助金を登録</span>
            </Link>
          </div>
        </div>

        {/* Subsidy Cards */}
        <div className="flex flex-col items-start px-4 sm:px-6 pt-6 pb-20 lg:pb-6 gap-6 w-full">
          {loading ? (
            <p className="text-[#4A5565]">読み込み中...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
              {subsidies.map((subsidy) => (
                <SubsidyCard key={subsidy.id} subsidy={subsidy} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
