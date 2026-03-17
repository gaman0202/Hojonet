'use client';

import { useState, useMemo, useEffect } from 'react';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import { SearchIcon, ChevronDownIcon } from '@/components/icons';

import IntroducerCard from './components/IntroducerCard';
import { Introducer } from './types';

const INDUSTRY_OPTIONS = [
  '全業種',
  'IT・テクノロジー',
  '小売業',
  '製造業',
  'デザイン',
  'サービス業',
];

export default function IntroducersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRY_OPTIONS[0]);
  const [introducers, setIntroducers] = useState<Introducer[]>([]);
  const [totalIntroducers, setTotalIntroducers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/expert/introducers');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setIntroducers(data.introducers ?? []);
        setTotalIntroducers(data.totalIntroducers ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return introducers.filter((item) => {
      const matchQuery =
        item.name.includes(searchQuery) ||
        item.email.includes(searchQuery) ||
        item.phone.includes(searchQuery);
      const matchIndustry = selectedIndustry === '全業種' || item.industry === selectedIndustry;
      return matchQuery && matchIndustry;
    });
  }, [introducers, searchQuery, selectedIndustry]);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="introducers" />

      <main className="flex flex-col items-start flex-grow min-w-0 lg:ml-[255px]">
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-[1px] gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1 pb-0 lg:pb-4">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                紹介者管理
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                全{totalIntroducers}名
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
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDownIcon size={20} color="#4A5565" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start px-6 py-6 w-full flex-grow">
          {loading && (
            <div className="w-full py-8 text-center text-[#4A5565]">読み込み中...</div>
          )}
          {error && (
            <div className="w-full py-8 text-center text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="w-full py-8 text-center text-[#4A5565]">該当する紹介者がいません。</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {filtered.map((intro) => (
                <IntroducerCard key={intro.id} introducer={intro} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
