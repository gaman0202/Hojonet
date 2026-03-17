'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import {
  LocationIcon,
  ClockIcon,
  BuildingIcon,
  EditIconAlt,
  ArrowRightIcon,
} from '@/components/icons';
import { Subsidy } from '../types';

interface SubsidyCardProps {
  subsidy: Subsidy;
}

export function SubsidyCard({ subsidy }: SubsidyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const checkTextOverflow = () => {
      if (!textRef.current) return;

      if (!isExpanded) {
        // line-clamp가 적용된 상태에서 scrollHeight와 clientHeight 비교
        // scrollHeight가 clientHeight보다 크면 텍스트가 잘린 것
        const isTextTruncated = textRef.current.scrollHeight > textRef.current.clientHeight + 1;
        setShowMoreButton(isTextTruncated);
      } else {
        // 확장된 상태에서는 항상 "閉じる" 버튼 표시
        setShowMoreButton(true);
      }
    };

    // 레이아웃 계산 후 즉시 체크
    checkTextOverflow();

    // 리사이즈 이벤트 감지
    const handleResize = () => {
      checkTextOverflow();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [subsidy.overview, isExpanded]);

  return (
    <div className="flex flex-col items-start bg-white border-2 border-[#E5E7EB] rounded-[14px] overflow-hidden min-h-[420px]">
      {/* Header with Gradient */}
      <div className="flex flex-col items-start px-6 py-[17px] gap-2 w-full bg-gradient-to-r from-[#EFF6FF] to-[#FAF5FF] border-b border-[#E5E7EB]">
        <div className="flex flex-row justify-between items-start gap-4 w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Status Badges */}
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <span
                className={`flex flex-row justify-center items-center px-3 py-1 rounded-full text-xs font-normal leading-4 whitespace-nowrap ${
                  subsidy.status === 'open'
                    ? 'bg-[#DBEAFE] border border-[#BBD8FF] text-[#1447E6]'
                    : 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#364153]'
                }`}
              >
                {subsidy.statusLabel}
              </span>
              <span className="flex flex-row justify-center items-center px-3 py-1 bg-[#F3E8FF] border border-[#E9D4FF] rounded-full text-xs font-normal leading-4 text-[#8200DB] whitespace-nowrap">
                {subsidy.caseCount}件の案件
              </span>
            </div>
            {/* Title */}
            <h2 className="text-[20px] font-normal leading-7 tracking-[-0.449219px] text-[#101828]">
              {subsidy.title}
            </h2>
          </div>
          {/* Edit Button */}
          <Link
            href={`/admin/management/${subsidy.id}/edit`}
            className="p-2 rounded-[10px] hover:bg-white/50 transition-colors flex-shrink-0"
          >
            <EditIconAlt size={20} color="#99A1AF" />
          </Link>
        </div>

        {/* Amount and Expert Count */}
        <div className="flex flex-col items-start gap-3 w-full mt-2">
          <span className="text-2xl sm:text-[30px] font-normal leading-8 sm:leading-[36px] tracking-[0.395508px] text-[#9810FA]">
            {subsidy.amount}
          </span>
          <div className="flex flex-row items-center gap-1.5 px-2 py-2 bg-white rounded-[10px]">
            <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] whitespace-nowrap">
              参加中の専門家:
            </span>
            <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA]">
              {subsidy.expertCount}名
            </span>
          </div>
        </div>
      </div>

      {/* Content - flex-1でカード高さを揃え、フッター上の区切り線を同一位置に */}
      <div className="flex flex-col flex-1 min-h-0 items-start px-6 py-6 w-full">
        {/* Location, Industry, Deadline */}
        <div className="flex flex-col gap-3 w-full mb-4">
          <div className="flex flex-row items-center gap-2">
            <LocationIcon size={16} color="#4A5565" />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              {subsidy.location}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <BuildingIcon size={16} color="#4A5565" />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              {subsidy.industry}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <ClockIcon size={16} color="#E7000B" />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#E7000B]">
              申請期限: {subsidy.deadline}
            </span>
          </div>
        </div>

        {/* Overview */}
        <div className="flex flex-col gap-2 w-full mb-4">
          <p
            ref={textRef}
            className={`text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] break-words ${
              !isExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {subsidy.overview}
          </p>
          {showMoreButton && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA] hover:underline self-start"
            >
              {isExpanded ? '閉じる' : 'もっと見る'}
            </button>
          )}
        </div>

        {/* Eligible Activities */}
        <div className="flex flex-col gap-2 w-full mb-4">
          <p className="text-xs font-normal leading-4 text-[#6A7282]">対象となる取組</p>
          <div className="flex flex-row items-center gap-2 flex-wrap">
            {subsidy.eligibleActivities.map((activity, idx) => (
              <span
                key={idx}
                className="flex flex-row justify-center items-center px-3 py-1 bg-[#FAF5FF] border border-[#E9D4FF] rounded text-xs font-normal leading-4 text-[#8200DB]"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>

        {/* 余白でフッターを下に固定し、区切り線の位置を全カードで揃える */}
        <div className="flex-1 min-h-[20px] w-full" />

        {/* Footer */}
        <div className="flex flex-row justify-between items-center w-full pt-4 border-t border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
              案件:
            </span>
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
              {subsidy.caseNumber}件
            </span>
          </div>
          <Link
            href={`/admin/management/${subsidy.id}`}
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
