'use client';

import { useState, useEffect, useMemo, useRef, useLayoutEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import {
  SearchIcon,
  LocationIcon,
  ClockIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  BuildingIcon,
} from '@/components/icons';

import { regionOptions, amountOptions } from './data';
import type { Subsidy } from './types';

/** 金額文字列から数値（万円）を抽出。例: "40万円" → 40, "最大200万円" → 200 */
function parseAmountMan(amountStr: string): number | null {
  if (!amountStr || amountStr === '未設定') return null;
  const match = amountStr.match(/(\d+(?:\.\d+)?)\s*万/);
  return match ? parseFloat(match[1]) : null;
}

// Pagination
const ITEMS_PER_PAGE = 10;

// Static options for industry and institution filters
const industryOptions = ['業種を選択', '製造業', 'IT・ソフトウェア', 'サービス業', '小売・卸売', 'その他'];
const institutionOptions = ['機関を選択', '経済産業省', '中小企業庁', '東京都', '地方自治体', 'その他'];

// API の Subsidy 形式を expert search の Subsidy に変換
function mapApiToSubsidy(row: {
  id: string;
  statusTags?: string[];
  title: string;
  location?: string;
  deadline?: string;
  deadlineColor?: string;
  amount?: string;
  subsidyRate?: string;
  overview?: string;
  eligibleActivities?: string[];
  eligibilityConditions?: string[];
}): Subsidy {
  const status = row.statusTags ?? ['公募中'];
  const isUrgent = row.deadlineColor === '#E7000B';
  const deadlineText = row.deadline?.replace(/^申請期限:\s*/, '') ?? '期限なし';
  return {
    id: parseInt(row.id, 10) || 0,
    status,
    title: row.title ?? '',
    institution: row.location?.split(/\s+/)[0] || undefined,
    region: row.location ?? '全国',
    deadline: deadlineText,
    deadlineUrgent: isUrgent,
    maxAmount: row.amount ?? '未設定',
    subsidyRate: row.subsidyRate ?? '未設定',
    overview: row.overview ?? '',
    eligibleActivities: row.eligibleActivities ?? [],
    eligibilityConditions: row.eligibilityConditions ?? [],
  };
}

/** 概要 3줄 초과 시 ... + もっと見る/閉じる (admin SubsidyCard と同様) */
function OverviewWithMore({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const checkTextOverflow = () => {
      if (!textRef.current) return;
      if (!isExpanded) {
        const isTextTruncated = textRef.current.scrollHeight > textRef.current.clientHeight + 1;
        setShowMoreButton(isTextTruncated);
      } else {
        setShowMoreButton(true);
      }
    };
    checkTextOverflow();
    const handleResize = () => checkTextOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [text, isExpanded]);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs lg:text-sm font-bold leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
        概要
      </h3>
      <p
        ref={textRef}
        className={`text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565] break-words ${
          !isExpanded ? 'line-clamp-3' : ''
        }`}
      >
        {text}
      </p>
      {showMoreButton && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#9810FA] hover:underline self-start"
        >
          {isExpanded ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </div>
  );
}

export default function ExpertSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#155DFC]"></div>
      </div>
    }>
      <ExpertSearchPageInner />
    </Suspense>
  );
}

function ExpertSearchPageInner() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId') ?? '';

  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('すべて');
  const [amountFilter, setAmountFilter] = useState('すべて');
  const [industryFilter, setIndustryFilter] = useState('業種を選択');
  const [institutionFilter, setInstitutionFilter] = useState('機関を選択');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch('/api/subsidies')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data.map(mapApiToSubsidy) : [];
        setSubsidies(list);
      })
      .catch(() => setSubsidies([]))
      .finally(() => setLoading(false));
  }, []);

  // 検索・フィルター適用
  const filteredSubsidies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = (s: Subsidy) => {
      if (!q) return true;
      const text = [
        s.title,
        s.overview,
        ...s.eligibleActivities,
        ...s.eligibilityConditions,
      ].join(' ').toLowerCase();
      return text.includes(q);
    };
    const matchRegion = (s: Subsidy) => {
      if (regionFilter === 'すべて') return true;
      return s.region === regionFilter || s.region.includes(regionFilter);
    };
    const matchAmount = (s: Subsidy) => {
      if (amountFilter === 'すべて') return true;
      const man = parseAmountMan(s.maxAmount);
      if (man === null) return amountFilter === 'すべて';
      if (amountFilter === '100万円以下') return man <= 100;
      if (amountFilter === '100万円〜500万円') return man >= 100 && man <= 500;
      if (amountFilter === '500万円以上') return man >= 500;
      return true;
    };
    const matchIndustry = (s: Subsidy) => {
      if (industryFilter === '業種を選択') return true;
      const searchable = [s.overview, ...s.eligibleActivities, ...s.eligibilityConditions].join(' ').toLowerCase();
      return searchable.includes(industryFilter.toLowerCase());
    };
    const matchInstitution = (s: Subsidy) => {
      if (institutionFilter === '機関を選択') return true;
      const loc = (s.region + ' ' + (s.institution ?? '')).toLowerCase();
      return loc.includes(institutionFilter.toLowerCase());
    };

    return subsidies.filter(
      (s) =>
        matchSearch(s) &&
        matchRegion(s) &&
        matchAmount(s) &&
        matchIndustry(s) &&
        matchInstitution(s)
    );
  }, [subsidies, searchQuery, regionFilter, amountFilter, industryFilter, institutionFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubsidies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubsidies = filteredSubsidies.slice(startIndex, endIndex);

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

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    regionFilter !== 'すべて' ||
    amountFilter !== 'すべて' ||
    industryFilter !== '業種を選択' ||
    institutionFilter !== '機関を選択';

  const resetFilters = () => {
    setSearchQuery('');
    setRegionFilter('すべて');
    setAmountFilter('すべて');
    setIndustryFilter('業種を選択');
    setInstitutionFilter('機関を選択');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="search" />

      {/* Main Content */}
      <main className="flex flex-col items-start w-full min-w-0 lg:ml-[255px]">
        {/* Header Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-[1px] gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1 pb-0 lg:pb-4">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                補助金目録・検索
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                参加可能な補助金案件を探すことができます
              </p>
            </div>
          </div>
        </div>

        {customerId && (
          <div className="mx-4 lg:mx-6 mt-2 rounded-[10px] bg-[#EFF6FF] border border-[#DBEAFE] px-4 py-3">
            <p className="text-sm font-normal leading-5 text-[#155DFC]">
              選択した顧客で新規案件を作成します。補助金を選択してください。
            </p>
          </div>
        )}
        {/* Search and Filter Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 pb-4 lg:py-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          {/* Search Bar */}
          <div className="relative w-full h-[50px]">
            <div className="absolute left-3 top-[15px]">
              <SearchIcon size={20} color="#99A1AF" />
            </div>
            <input
              type="text"
              placeholder="補助金を検索..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[50px] pl-10 pr-4 border border-[#D1D5DC] rounded-[10px] text-base leading-[19px] tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
            />
          </div>

          {/* Filters Container */}
          <div className="flex flex-col gap-3 lg:gap-4 w-full">
            {/* First Row: Region and Amount */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                  地域を選択
                </label>
                <div className="relative">
                  <select
                    value={regionFilter}
                    onChange={(e) => {
                      setRegionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36.5px] px-2.5 pr-10 bg-white border border-[#D1D5DC] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  >
                    {regionOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDownIcon size={20} color="#4A5565" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                  金額で絞る
                </label>
                <div className="relative">
                  <select
                    value={amountFilter}
                    onChange={(e) => {
                      setAmountFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36.5px] px-2.5 pr-10 bg-white border border-[#D1D5DC] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  >
                    {amountOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDownIcon size={20} color="#4A5565" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row: Industry and Institution */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 w-full">
              {/* Industry Filter */}
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                  業種を選択
                </label>
                <div className="relative">
                  <select
                    value={industryFilter}
                    onChange={(e) => {
                      setIndustryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36.5px] px-2.5 pr-10 bg-white border border-[#D1D5DC] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  >
                    {industryOptions.map((option) => (
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

              {/* Institution Filter */}
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                  機関を選択
                </label>
                <div className="relative">
                  <select
                    value={institutionFilter}
                    onChange={(e) => {
                      setInstitutionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36.5px] px-2.5 pr-10 bg-white border border-[#D1D5DC] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  >
                    {institutionOptions.map((option) => (
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

            {hasActiveFilters && (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-normal leading-5 text-[#9810FA] hover:underline focus:outline-none"
                >
                  フィルターをリセット
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subsidy List Section */}
        <div className="flex flex-col items-start px-4 lg:pl-16 lg:pr-32 pt-4 lg:pt-6 pb-6 lg:pb-8 w-full">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#155DFC]" />
              <span className="ml-3 text-[#4A5565]">読み込み中...</span>
            </div>
          ) : (
          <div className="flex flex-col gap-4 lg:gap-6 w-full">
            {/* 検索結果件数 */}
            <p className="text-sm font-normal leading-5 text-[#4A5565]">
              検索結果: {filteredSubsidies.length}件
            </p>
            {filteredSubsidies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-[#E5E7EB] rounded-[14px]">
                <SearchIcon size={48} color="#99A1AF" className="mb-4" />
                <p className="text-base font-normal leading-6 text-[#364153] mb-2">
                  条件に一致する補助金がありません
                </p>
                <p className="text-sm font-normal leading-5 text-[#6A7282] mb-4">
                  検索ワードやフィルターを変更してお試しください
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-normal leading-5 text-[#9810FA] border border-[#9810FA] rounded-[10px] hover:bg-[#FAF5FF] transition-colors"
                >
                  フィルターをリセット
                </button>
              </div>
            ) : (
            <>
            {paginatedSubsidies.map((subsidy) => (
              <div
                key={subsidy.id}
                className="flex flex-col bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden"
              >
                <div className="flex flex-col p-4 lg:p-6 gap-3">
                  {/* Header */}
                  <div className="flex flex-row justify-between items-start gap-3 lg:gap-6 w-full">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {/* Status Badges */}
                      <div className="flex flex-row items-center gap-2 flex-wrap">
                        {subsidy.status.map((status, idx) => (
                          <span
                            key={idx}
                            className={`flex flex-row justify-center items-center px-2 lg:px-3 py-1 rounded-full text-xs font-normal leading-4 whitespace-nowrap ${
                              status === '公募中'
                                ? 'bg-[#DBEAFE] text-[#155DFC]'
                                : 'bg-[#FFE2E2] text-[#E7000B]'
                            }`}
                          >
                            {status === '締切間近' && (
                            <img
                              src="/icons/exclamation.svg"
                              alt="締切間近"
                              className="mr-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
                            />
                          )}
                            {status}
                          </span>
                        ))}
                      </div>
                      {/* Title */}
                      <h2 className="text-base lg:text-lg font-bold leading-6 lg:leading-7 tracking-[-0.439453px] text-[#101828] mt-1">
                        {subsidy.title}
                      </h2>
                      {/* Meta Info: 모바일 2줄(회사+지역 / 기한), PC 한 줄(3개 나란히) */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 flex-wrap mt-1">
                        {subsidy.institution && (
                          <div className="flex flex-row lg:contents items-center gap-3 lg:gap-4 min-w-0 w-full">
                            <div className="flex flex-row items-center gap-2 min-w-0 flex-1 lg:flex-initial">
                              <BuildingIcon size={16} color="#4A5565" className="shrink-0" />
                              <span className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565] truncate">
                                {subsidy.institution}
                              </span>
                            </div>
                            <div className="flex flex-row items-center gap-2 min-w-0 flex-1 lg:flex-initial">
                              <LocationIcon size={16} color="#4A5565" className="shrink-0" />
                              <span className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565] truncate">
                                {subsidy.region}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-row items-center gap-1 min-w-0">
                          <ClockIcon
                            size={16}
                            color={subsidy.deadlineUrgent ? '#E7000B' : '#4A5565'}
                            className="shrink-0"
                          />
                          <span
                            className={`text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] truncate ${
                              subsidy.deadlineUrgent ? 'text-[#E7000B]' : 'text-[#4A5565]'
                            }`}
                          >
                            申請期限: {subsidy.deadline}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Arrow Button */}
                    <Link
                      href={customerId ? `/expert/search/${subsidy.id}?customerId=${encodeURIComponent(customerId)}` : `/expert/search/${subsidy.id}`}
                      className="flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 bg-[#155DFC] rounded-full flex-shrink-0 hover:bg-[#1248C4] transition-colors"
                    >
                      <ArrowRightIcon size={20} color="#FFFFFF" className="lg:w-6 lg:h-6" />
                    </Link>
                  </div>

                  {/* Financial Info: 상자 절반씩, 왼쪽 상한금액 / 오른쪽 보조율 */}
                  <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 py-3 bg-[#EFF6FF] rounded-[10px]">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-normal leading-4 text-[#4A5565]">上限金額</span>
                      <span className="text-lg lg:text-xl font-bold leading-6 lg:leading-7 tracking-[-0.449219px] text-[#155DFC] truncate">
                        {subsidy.maxAmount}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-normal leading-4 text-[#4A5565]">補助率</span>
                      <span className="text-lg lg:text-xl font-bold leading-6 lg:leading-7 tracking-[-0.449219px] text-[#155DFC]">
                        {subsidy.subsidyRate}
                      </span>
                    </div>
                  </div>

                  {/* Overview: 3줄 초과 시 ... + もっと見る/閉じる */}
                  <OverviewWithMore text={subsidy.overview} />

                  {/* Eligible Activities */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xs lg:text-sm font-bold leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                      対象となる取組
                    </h3>
                    <div className="flex flex-row items-center gap-2 flex-wrap">
                      {subsidy.eligibleActivities.map((activity, idx) => (
                        <span
                          key={idx}
                          className="flex flex-row justify-center items-center px-2 py-[3px] bg-[#F3E8FF] rounded text-xs font-normal leading-4 text-[#8200DB]"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Eligibility Conditions */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xs lg:text-sm font-bold leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
                      対象条件
                    </h3>
                    <div className="flex flex-row items-center gap-2 flex-wrap">
                      {subsidy.eligibilityConditions.map((condition, idx) => (
                        <span
                          key={idx}
                          className="flex flex-row justify-center items-center px-2 py-[3px] bg-[#F3F4F6] rounded text-xs font-normal leading-4 text-[#364153]"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination - Figma: Pagination - Medium */}
            {totalPages > 1 && (
              <div className="flex flex-row items-center justify-center gap-1 w-full mt-6">
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

            {filteredSubsidies.length > 0 && totalPages > 1 && (
              <p className="text-sm text-[#6A7282] text-center w-full mt-2">
                {filteredSubsidies.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredSubsidies.length)}件を表示
              </p>
            )}
            </>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
