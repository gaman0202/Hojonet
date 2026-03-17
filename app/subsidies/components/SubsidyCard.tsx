'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { LocationIcon, CalendarIcon, ArrowRightIcon, BuildingIcon } from '@/components/icons';
import { Subsidy } from '../types';

interface SubsidyCardProps {
  subsidy: Subsidy;
}

export default function SubsidyCard({ subsidy }: SubsidyCardProps) {
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
    <Link
      href={`/subsidies/${subsidy.id}`}
      className="w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[14px] p-3 sm:p-4 md:p-6 flex flex-col gap-2.5 sm:gap-3 hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Header with Status Tags and Arrow */}
      <div className="flex flex-row justify-between items-start gap-2 sm:gap-3 md:gap-6">
        <div className="flex flex-col items-start gap-1 sm:gap-1.5 md:gap-1 flex-1 min-w-0">
          {/* Status Tags */}
          <div className="flex flex-row items-center gap-1.5 sm:gap-2 flex-wrap">
            {subsidy.statusTags.map((tag, index) => (
              <div
                key={index}
                className={`flex items-center justify-center px-1.5 sm:px-2 md:px-3 py-0.5 rounded-full ${
                  tag === '公募中' ? 'bg-[#DBEAFE]' : 'bg-[#FFE2E2]'
                }`}
              >
                {tag === '締切間近' && (
                  <img
                    src="/icons/exclamation.svg"
                    alt="締切間近"
                    className="mr-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
                  />
                )}
                <span
                  className={`text-[9px] sm:text-[10px] md:text-xs leading-3 sm:leading-3.5 md:leading-4 ${
                    tag === '公募中' ? 'text-[#155DFC]' : 'text-[#E7000B]'
                  }`}
                >
                  {tag}
                </span>
              </div>
            ))}
          </div>

          {/* Title */}
          <h3
            className="w-full text-sm sm:text-base md:text-lg font-bold text-[#101828] leading-5 sm:leading-6 md:leading-7 tracking-[-0.439px] line-clamp-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {subsidy.title}
          </h3>

          {/* 実施機関 → Location → 申請期限 */}
          <div className="flex flex-row items-center flex-wrap gap-x-4 gap-y-1 w-full">
            {subsidy.implementingOrganization && (
              <div className="flex flex-row items-center gap-2 shrink-0">
                <span className="flex shrink-0">
                  <BuildingIcon size={16} color="#4A5565" />
                </span>
                <span className="text-[10px] sm:text-xs md:text-sm text-[#4A5565] leading-5 tracking-[-0.15px] truncate">
                  {subsidy.implementingOrganization}
                </span>
              </div>
            )}
            <div className="flex flex-row items-center gap-1 shrink-0">
              <span className="flex shrink-0">
                <LocationIcon size={16} color="#4A5565" />
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-[#4A5565] leading-5 tracking-[-0.15px] truncate">
                {subsidy.location}
              </span>
            </div>
            <div className="flex flex-row items-center gap-1 shrink-0">
              <span className="flex shrink-0">
                <CalendarIcon size={16} color={subsidy.deadlineColor} />
              </span>
              <span
                className="text-[10px] sm:text-xs md:text-sm leading-5 tracking-[-0.15px]"
                style={{ color: subsidy.deadlineColor }}
              >
                {subsidy.deadline}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-[#155DFC] rounded-full flex-shrink-0">
          <ArrowRightIcon size={18} color="#FFFFFF" className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>
      </div>

      {/* Financial Info */}
      <div className="flex flex-row items-start gap-3 sm:gap-4 md:gap-10 p-2 sm:p-2.5 md:p-3 bg-[#EFF6FF] rounded-[10px]">
        <div className="flex flex-col items-start gap-1 flex-1">
          <span className="text-[9px] sm:text-[10px] md:text-xs text-[#4A5565] leading-3 sm:leading-3.5 md:leading-4">
            上限金額
          </span>
          <span
            className="text-base sm:text-lg md:text-xl font-bold text-[#155DFC] leading-5 sm:leading-6 md:leading-7 tracking-[-0.449px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {subsidy.amount}
          </span>
        </div>
        <div className="flex flex-col items-start gap-1 flex-1">
          <span className="text-[9px] sm:text-[10px] md:text-xs text-[#4A5565] leading-3 sm:leading-3.5 md:leading-4">
            補助率
          </span>
          <span
            className="text-base sm:text-lg md:text-xl font-bold text-[#155DFC] leading-5 sm:leading-6 md:leading-7 tracking-[-0.449px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {subsidy.subsidyRate}
          </span>
        </div>
      </div>

      {/* Overview */}
      <div className="flex flex-col items-start gap-0.5 sm:gap-1 w-full min-w-0">
        <span
          className="text-[10px] sm:text-xs md:text-sm font-bold text-[#364153] leading-3.5 sm:leading-4 md:leading-5 tracking-[-0.15px]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          概要
        </span>
        <p
          ref={textRef}
          className={`w-full min-w-0 text-[10px] sm:text-xs md:text-sm text-[#4A5565] leading-4 sm:leading-4.5 md:leading-5 tracking-[-0.15px] break-words ${
            !isExpanded ? 'line-clamp-3' : ''
          }`}
        >
          {subsidy.overview}
        </p>
        {showMoreButton && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-[10px] sm:text-xs md:text-sm font-normal leading-4 sm:leading-4.5 md:leading-5 tracking-[-0.15px] text-[#155DFC] hover:underline self-start"
          >
            {isExpanded ? '閉じる' : 'もっと見る'}
          </button>
        )}
      </div>

      {/* Eligible Activities */}
      <div className="flex flex-col items-start gap-0.5 sm:gap-1">
        <span
          className="text-[10px] sm:text-xs md:text-sm font-bold text-[#364153] leading-3.5 sm:leading-4 md:leading-5 tracking-[-0.15px]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          対象となる取組
        </span>
        <div className="flex flex-row items-center gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
          {subsidy.eligibleActivities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-center px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-0.75 bg-[#F3E8FF] rounded"
            >
              <span className="text-[9px] sm:text-[10px] md:text-xs text-[#8200DB] leading-3 sm:leading-3.5 md:leading-4 whitespace-nowrap">
                {activity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Eligibility Conditions */}
      <div className="flex flex-col items-start gap-0.5 sm:gap-1">
        <span
          className="text-[10px] sm:text-xs md:text-sm font-bold text-[#364153] leading-3.5 sm:leading-4 md:leading-5 tracking-[-0.15px]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          対象条件
        </span>
        <div className="flex flex-row items-center gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
          {subsidy.eligibilityConditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-center justify-center px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-0.75 bg-[#F3F4F6] rounded"
            >
              <span className="text-[9px] sm:text-[10px] md:text-xs text-[#364153] leading-3 sm:leading-3.5 md:leading-4 whitespace-nowrap">
                {condition}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
