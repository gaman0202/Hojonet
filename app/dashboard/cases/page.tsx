// app/dashboard/cases/page.tsx 

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GridIcon,
  HomeIcon,
  DocumentIcon,
  UserIcon,
  LogOutIcon,
} from '@/components/icons';

// Components
import CaseCard from './components/CaseCard';

// Types & Data
import { FilterType, CaseItem } from './types';

// Status mapping
const STATUS_LABELS: Record<string, string> = {
  consultation: '相談受付',
  hearing: 'ヒアリング中',
  doc_prep: '書類準備',
  doc_review: '書類確認',
  submitted: '申請完了',
  reviewing: '審査中',
  approved: '交付決定',
};

// Pagination settings
const ITEMS_PER_PAGE = 5;

export default function CasesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ key: FilterType; label: string; count: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        console.error('Error fetching cases:', res.statusText);
        return;
      }
      const json = await res.json();
      const caseList = (json.cases || []) as {
        id: number;
        title: string;
        status: string;
        amount: string;
        deadline: string;
        progress_rate: number;
        needs_attention: boolean;
        unread_message_count: number;
        urgent_task_count: number;
        assignee_name: string;
      }[];

      const transformedCases: CaseItem[] = caseList.map((c) => ({
        id: c.id.toString(),
        status: c.status,
        statusText: STATUS_LABELS[c.status] || c.status,
        needsAction: c.needs_attention ?? false,
        title: c.title || '案件',
        amount: c.amount || '',
        deadline: c.deadline ? formatDate(c.deadline) : '',
        daysLeft: c.deadline ? calculateDaysLeft(c.deadline) : null,
        progress: c.progress_rate || 0,
        assignee: c.assignee_name || '担当者未定',
        messageCount: c.unread_message_count || 0,
        taskCount: c.urgent_task_count || 0,
      }));

      setCases(transformedCases);
      const statusCounts: Record<string, number> = {};
      transformedCases.forEach((c) => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });
      const newFilters = [
        { key: 'all' as FilterType, label: 'すべて', count: transformedCases.length },
        { key: 'hearing' as FilterType, label: 'ヒアリング中', count: statusCounts['hearing'] || 0 },
        { key: 'doc_prep' as FilterType, label: '書類準備中', count: statusCounts['doc_prep'] || 0 },
        { key: 'submitted' as FilterType, label: '申請完了', count: statusCounts['submitted'] || 0 },
        { key: 'reviewing' as FilterType, label: '審査中', count: statusCounts['review'] || 0 },
        { key: 'approved' as FilterType, label: '交付決定', count: statusCounts['accepted'] || 0 },
      ];
      setFilters(newFilters);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Filter cases based on active filter
  const filteredCases = activeFilter === 'all' 
    ? cases 
    : activeFilter === 'reviewing'
    ? cases.filter((c) => c.status === 'review')
    : activeFilter === 'approved'
    ? cases.filter((c) => c.status === 'accepted')
    : cases.filter((c) => c.status === activeFilter);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCases = filteredCases.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // Generate page numbers for pagination display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function calculateDaysLeft(dateStr: string): number | null {
    const deadline = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  return (
    <div className="flex flex-row min-h-screen bg-white lg:bg-white bg-[#F9FAFB]">
      <Sidebar activeItem="cases" />

      {/* Main Content */}
      <main className="flex flex-col items-start flex-grow min-w-0 lg:overflow-y-auto lg:h-screen">
        {/* Header - Mobile */}
        <div className="lg:hidden flex flex-row justify-between items-center px-4 py-4 gap-0 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-5 h-5"
            >
              <ArrowLeftIcon size={20} color="#4A5565" />
            </button>
            <h1 className="text-base font-medium leading-6 tracking-[-0.3125px] text-[#0A0A0A]">
              進行中の案件
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex justify-center items-center w-8 h-8 bg-[#DBEAFE] rounded-full">
              <span className="text-sm text-[#155DFC] leading-5 tracking-[-0.150391px]">田</span>
            </div>
            <button className="flex items-center justify-center w-8 h-8 border border-[#E5E7EB] rounded">
              <GridIcon size={16} color="#0A0A0A" />
            </button>
          </div>
        </div>

        {/* Header - Desktop */}
        <div className="hidden lg:flex flex-col items-start px-6 py-6 gap-2 w-full border-b border-[#E5E7EB]">
          <h1 className="text-2xl font-medium leading-9 tracking-[0.0703125px] text-[#101828]">
            進行中の案件
          </h1>
          <p className="text-base text-[#4A5565] leading-6 tracking-[-0.3125px]">
            現在進行中の補助金申請を確認・管理できます
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-row items-end px-4 lg:px-6 gap-0 w-full border-b border-[#E5E7EB] overflow-x-auto flex-shrink-0">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex flex-row justify-center items-center px-3 lg:px-4 py-3 lg:py-4 whitespace-nowrap transition-colors ${
                activeFilter === filter.key
                  ? 'border-b-2 border-[#155DFC] -mb-[1px]'
                  : 'border-b-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <span
                className={`text-xs lg:text-sm font-medium leading-4 lg:leading-5 tracking-[-0.150391px] text-center ${
                  activeFilter === filter.key ? 'text-[#155DFC]' : 'text-[#6A7282] lg:text-[#4A5565]'
                }`}
              >
                {filter.label} ({filter.count})
              </span>
            </button>
          ))}
        </div>

        {/* Cases List */}
        <div className="flex flex-col items-start px-4 lg:px-6 py-6 lg:py-6 gap-4 lg:gap-6 w-full flex-grow">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#155DFC]"></div>
              <p className="mt-4 text-[#4A5565]">読み込み中...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 w-full bg-white rounded-[14px] border border-[#E5E7EB]">
              <DocumentIcon size={48} color="#D1D5DC" />
              <p className="mt-4 text-[#4A5565]">進行中の案件がありません</p>
              <Link 
                href="/subsidies" 
                className="mt-4 px-6 py-2 bg-[#155DFC] text-white rounded-lg hover:bg-[#1248C4] transition-colors"
              >
                補助金を探す
              </Link>
            </div>
          ) : (
          <div className="flex flex-col gap-4 lg:gap-3 w-full">
            {paginatedCases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))}
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-row justify-center items-center gap-2 lg:gap-2.5 w-full mt-4">
              {/* Previous Button */}
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex justify-center items-center w-[31px] h-8 lg:w-7 lg:h-7 border border-[#E5E7EB] lg:border-[#D7DFE9] rounded lg:rounded-md transition-colors ${
                  currentPage === 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <ArrowLeftIcon size={16} color="#0A0A0A" />
              </button>
              
              {/* Page Numbers */}
              <div className="flex flex-row items-center gap-0 lg:gap-1">
                {getPageNumbers().map((page, index) => (
                  typeof page === 'number' ? (
                    <button
                      key={index}
                      onClick={() => handlePageChange(page)}
                      className={`flex justify-center items-center w-[31px] h-8 lg:w-[30px] lg:h-7 rounded lg:rounded-md text-xs lg:text-base font-medium leading-4 lg:leading-6 tracking-[-0.3px] transition-colors ${
                        page === currentPage
                          ? 'bg-[#155DFC] text-white lg:text-[#F9FAFB]'
                          : 'text-[#0A0A0A] lg:text-[#3D4A5C] border border-[#E5E7EB] lg:border-0 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span 
                      key={index}
                      className="flex justify-center items-center w-[31px] h-8 lg:w-[30px] lg:h-7 text-xs lg:text-sm text-[#6A7282] lg:text-[#3D4A5C]"
                    >
                      {page}
                    </span>
                  )
                ))}
              </div>
              
              {/* Next Button */}
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex justify-center items-center w-[31px] h-8 lg:w-7 lg:h-7 border border-[#E5E7EB] lg:border-[#D7DFE9] rounded lg:rounded-md transition-colors ${
                  currentPage === totalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <ArrowRightIcon size={16} color="#0A0A0A" />
              </button>
            </div>
          )}

          {/* Page Info */}
          {filteredCases.length > 0 && (
            <div className="flex justify-center w-full mt-2">
              <span className="text-sm text-[#6A7282]">
                {filteredCases.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredCases.length)}件を表示
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <HomeIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ホーム</span>
        </Link>
        <Link href="/dashboard/cases" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <DocumentIcon size={20} color="#155DFC" />
          <span className="text-xs text-[#155DFC] leading-4">案件</span>
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
