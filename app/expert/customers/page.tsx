'use client';

import { useState, useMemo, useEffect } from 'react';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import { SearchIcon, ChevronDownIcon, ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';

import CustomerCard from './components/CustomerCard';
import { Customer } from './types';

const INDUSTRIES = ['全業種', 'IT・テクノロジー', '小売業', '製造業', 'デザイン', 'サービス業'];
const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/expert/customers');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setCustomers(data.customers ?? []);
        setTotalCustomers(data.totalCustomers ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchIndustry = selectedIndustry === '全業種' || c.industry === selectedIndustry;
      return matchQuery && matchIndustry;
    });
  }, [customers, searchQuery, selectedIndustry]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCustomers = filtered.slice(startIndex, endIndex);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedIndustry]);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="customers" />

      <main className="flex flex-col items-start flex-grow min-w-0 lg:ml-[255px]">
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-[1px] gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1 pb-0 lg:pb-4">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                顧客管理
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                全{totalCustomers}名
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 pb-4 lg:py-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <SearchIcon size={20} color="#99A1AF" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="顧客名、会社名、メールで検索..."
                className="w-full pl-10 pr-4 py-2.5 text-base font-normal leading-5 tracking-[-0.3125px] text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDownIcon size={20} color="#4A5565" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start px-6 py-6 flex-grow w-full min-w-0">
          <div className="flex flex-col w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
            {loading && (
              <div className="px-5 py-8 text-center text-[#4A5565]">読み込み中...</div>
            )}
            {error && (
              <div className="px-5 py-8 text-center text-red-600">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-5 py-8 text-center text-[#4A5565]">該当する顧客がいません。</div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <>
                {paginatedCustomers.map((customer, index) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    isLast={index === paginatedCustomers.length - 1}
                  />
                ))}
                {totalPages > 1 && (
                  <div className="flex flex-row items-center justify-center gap-1 w-full px-4 py-6 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center justify-center w-7 h-7 rounded-full border border-[#D7DFE9] text-[#3D4A5C] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-colors"
                      aria-label="前のページ"
                    >
                      <ArrowLeftIcon size={16} color="currentColor" />
                    </button>
                    <div className="flex flex-row items-center gap-1 mx-1">
                      {getPageNumbers().map((page, index) =>
                        typeof page === 'number' ? (
                          <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => handlePageChange(page)}
                            className={`flex items-center justify-center min-w-[30px] h-7 px-1 rounded-md text-base font-medium tracking-[-0.3px] transition-colors ${
                              page === currentPage
                                ? 'bg-[#155DFC] text-[#F9FAFB]'
                                : 'text-[#3D4A5C] hover:bg-[#F3F4F6]'
                            }`}
                          >
                            {page}
                          </button>
                        ) : (
                          <span
                            key={`ellipsis-${index}`}
                            className="flex items-center justify-center min-w-[30px] h-7 text-sm font-medium tracking-[-0.2px] text-[#3D4A5C]"
                          >
                            ...
                          </span>
                        )
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center justify-center w-7 h-7 rounded-full border border-[#D7DFE9] text-[#3D4A5C] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-colors"
                      aria-label="次のページ"
                    >
                      <ArrowRightIcon size={16} color="currentColor" />
                    </button>
                  </div>
                )}
                {filtered.length > 0 && totalPages > 1 && (
                  <p className="text-sm text-[#6A7282] text-center w-full pb-4">
                    {filtered.length}件中 {startIndex + 1}-{Math.min(endIndex, filtered.length)}件を表示
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
