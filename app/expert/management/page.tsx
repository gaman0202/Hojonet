'use client';

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import Link from 'next/link';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import {
  LocationIcon,
  ClockIcon,
  BuildingIcon,
  ArrowRightIcon,
  EditIconAlt,
  VectorIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import type { SummaryCard, Subsidy } from './types';
import type { ComponentType } from 'react';

type RelationName = { name?: string } | { name?: string }[] | null | undefined;
function getRelationName(v: RelationName): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v?.name ?? '');
}

type Row = {
  id: number;
  title: string;
  amount_description?: string | null;
  application_period_end?: string | null;
  subsidy_rate?: string | null;
  overview?: string | null;
  m_regions?: RelationName;
  m_institutions?: RelationName;
  eligible_activities?: { activity_name: string }[] | null;
};

function parseEndDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const d = parseInt(match[3], 10);
  return new Date(y, m, d);
}

function mapRowToSubsidy(row: Row): Subsidy {
  const endDate = parseEndDateOnly(row.application_period_end);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;
  const isOpen = !endDateOnly || today <= endDateOnly;
  const daysLeft = endDateOnly && today <= endDateOnly
    ? Math.ceil((endDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const deadlineUrgent = isOpen && daysLeft <= 7;
  const regionName = getRelationName(row.m_regions);
  const orgName = getRelationName(row.m_institutions);
  const statusLabel = !endDateOnly ? '公募中' : today > endDateOnly ? '募集終了' : daysLeft <= 7 ? '締切間近' : '公募中';
  const tags = (row.eligible_activities ?? []).map((a) => a.activity_name);

  return {
    id: row.id,
    status: statusLabel,
    statusColor: statusLabel === '公募中' || statusLabel === '締切間近' ? '#1447E6' : '#364153',
    statusBg: statusLabel === '公募中' || statusLabel === '締切間近' ? '#DBEAFE' : '#F3F4F6',
    statusBorder: statusLabel === '公募中' || statusLabel === '締切間近' ? '#BBD8FF' : '#E5E7EB',
    caseCount: '0件の案件',
    caseCountColor: '#8200DB',
    caseCountBg: '#F3E8FF',
    caseCountBorder: '#E9D4FF',
    title: row.title ?? '',
    amount: row.amount_description ?? '未設定',
    subsidyRate: row.subsidy_rate ?? '未設定',
    region: regionName || '全国',
    industry: orgName || '全国',
    deadline: endDate ? `${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日` : '期限なし',
    deadlineUrgent,
    description: row.overview ?? '',
    tags,
    caseNumber: '0件',
  };
}

function ManagementSubsidyCard({ subsidy }: { subsidy: Subsidy }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const check = () => {
      if (!descRef.current) return;
      if (!isExpanded) {
        const truncated = descRef.current.scrollHeight > descRef.current.clientHeight + 1;
        setShowMoreButton(truncated);
      } else {
        setShowMoreButton(true);
      }
    };
    check();
    const handleResize = () => check();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [subsidy.description, isExpanded]);

  return (
    <div className="flex flex-col bg-white border-2 border-[#E5E7EB] rounded-[14px] overflow-hidden min-h-[420px]">
      {/* Header */}
      <div className="flex flex-col p-4 lg:p-[17px] lg:px-6 gap-3 bg-gradient-to-r from-[#EFF6FF] to-[#FAF5FF] border-b border-[#E5E7EB]">
        <div className="flex flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <span
                className="flex items-center justify-center px-3 py-1 rounded-full text-xs font-normal leading-4 border"
                style={{
                  backgroundColor: subsidy.statusBg,
                  borderColor: subsidy.statusBorder,
                  color: subsidy.statusColor,
                }}
              >
                {subsidy.status}
              </span>
              <span
                className="flex items-center justify-center px-3 py-1 rounded-full text-xs font-normal leading-4 border"
                style={{
                  backgroundColor: subsidy.caseCountBg,
                  borderColor: subsidy.caseCountBorder,
                  color: subsidy.caseCountColor,
                }}
              >
                {subsidy.caseCount}
              </span>
            </div>
            <h2 className="text-lg lg:text-xl font-normal leading-6 lg:leading-7 tracking-[-0.449219px] text-[#101828]">
              {subsidy.title}
            </h2>
          </div>
          <Link
            href={`/expert/management/${subsidy.id}/settings`}
            className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <EditIconAlt size={20} color="#99A1AF" />
          </Link>
        </div>
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 w-full">
          <span className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#9810FA]">
            {subsidy.amount}
          </span>
          <div className="flex flex-row items-center gap-1.5 px-2 py-2 bg-white rounded-[10px]">
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              補助率 :
            </span>
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA]">
              {subsidy.subsidyRate}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-4 lg:p-6 lg:pt-6 lg:pb-6 gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-col items-start gap-3">
            <div className="flex flex-row items-center gap-2">
              <BuildingIcon size={16} color="#4A5565" />
              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                {subsidy.region}
              </span>
            </div>
            <div className="flex flex-row items-center gap-2">
              <LocationIcon size={16} color="#4A5565" />
              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                {subsidy.industry}
              </span>
            </div>
            <div className="flex flex-row items-center gap-2">
              <ClockIcon size={16} color={subsidy.deadlineUrgent ? '#E7000B' : '#4A5565'} />
              <span
                className={`text-sm font-normal leading-5 tracking-[-0.150391px] ${
                  subsidy.deadlineUrgent ? 'text-[#E7000B]' : 'text-[#4A5565]'
                }`}
              >
                申請期限: {subsidy.deadline}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 w-full min-w-0">
          <p
            ref={descRef}
            className={`text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] break-words ${
              !isExpanded ? 'line-clamp-2' : ''
            }`}
          >
            {subsidy.description}
          </p>
          {showMoreButton && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA] hover:underline self-start"
            >
              {isExpanded ? '閉じる' : 'もっと見る'}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-normal leading-4 text-[#6A7282]">対象となる取組</span>
          <div className="flex flex-row items-center gap-2 flex-wrap">
            {subsidy.tags.map((tag, idx) => (
              <span
                key={idx}
                className="flex items-center justify-center px-3 py-1 bg-[#FAF5FF] border border-[#E9D4FF] rounded text-xs font-normal leading-4 text-[#8200DB]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-[20px]" />

        <div className="flex flex-row justify-between items-center pt-4 border-t border-[#E5E7EB]">
          <Link
            href={`/expert/management/${subsidy.id}`}
            className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
              案件:
            </span>
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
              {subsidy.caseNumber}
            </span>
          </Link>
          <Link
            href={`/expert/management/${subsidy.id}`}
            className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA]">
              管理画面へ
            </span>
            <ArrowRightIcon size={16} color="#9810FA" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 8;

export default function ExpertManagementPage() {
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch('/api/expert/subsidies')
      .then((res) => (res.ok ? res.json() : { subsidies: [] }))
      .then((data) => {
        setSubsidies(Array.isArray(data.subsidies) ? data.subsidies : []);
      })
      .catch(() => setSubsidies([]))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(subsidies.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubsidies = useMemo(
    () => subsidies.slice(startIndex, endIndex),
    [subsidies, startIndex, endIndex]
  );

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

  const openCount = subsidies.filter((s) => s.status === '公募中' || s.status === '締切間近').length;
  // 各カードの案件数を合計（caseNumber は "1件" 等形式）
  const totalCases = subsidies.reduce((sum, s) => {
    const m = s.caseNumber.match(/^(\d+)/);
    return sum + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const summaryCards: SummaryCard[] = [
    {
      id: 1,
      title: '登録済み補助金',
      value: String(subsidies.length),
      icon: BuildingIcon as ComponentType<{ size: number; color: string }>,
      gradient: 'from-[#EFF6FF] to-[#DBEAFE]',
      iconBg: '#3681F7',
      iconColor: '#FFFFFF',
    },
    {
      id: 2,
      title: '進行中の案件',
      value: String(totalCases),
      icon: VectorIcon,
      gradient: 'from-[#F0FDF4] to-[#DCFCE7]',
      iconBg: '#00C950',
      iconColor: '#FFFFFF',
    },
    {
      id: 3,
      title: '募集中の補助金',
      value: String(openCount),
      icon: CalendarIcon,
      gradient: 'from-[#FAF5FF] to-[#F3E8FF]',
      iconBg: '#AD46FF',
      iconColor: '#FFFFFF',
    },
  ];

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="management" />

      {/* Main Content */}
      <main className="flex flex-col items-start w-full min-w-0 lg:ml-[255px]">
        {/* Header Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-[1px] gap-4 w-full bg-white border-b border-[#E5E7EB]">
          {/* Title Section */}
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1 pb-0 lg:pb-4">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                案件管理
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                登録補助金 {subsidies.length}件
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex flex-col lg:flex-row gap-4 w-full mb-6">
            {summaryCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.id}
                  className={`flex flex-col items-start p-4 lg:p-4 gap-4 flex-1 min-w-0 bg-gradient-to-r ${card.gradient} rounded-[10px]`}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-[10px] flex-shrink-0"
                    style={{ backgroundColor: card.iconBg }}
                  >
                    <IconComponent size={20} color={card.iconColor} />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-xl lg:text-2xl font-normal leading-7 lg:leading-8 tracking-[0.0703125px] text-[#101828]">
                      {card.value}
                    </span>
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      {card.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-8 lg:pb-12 gap-4 lg:gap-6 w-full">
          {loading ? (
            <p className="text-[#4A5565]">読み込み中...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
                {paginatedSubsidies.map((subsidy) => (
                  <ManagementSubsidyCard key={subsidy.id} subsidy={subsidy} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-row items-center justify-center gap-1 w-full px-4 py-6 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1}
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
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages}
                    className="flex items-center justify-center w-7 h-7 rounded-full border border-[#D7DFE9] text-[#3D4A5C] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-colors"
                    aria-label="次のページ"
                  >
                    <ArrowRightIcon size={16} color="currentColor" />
                  </button>
                </div>
              )}
              {subsidies.length > 0 && totalPages > 1 && (
                <p className="text-sm text-[#6A7282] text-center w-full">
                  {subsidies.length}件中 {startIndex + 1}-{Math.min(endIndex, subsidies.length)}件を表示
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
