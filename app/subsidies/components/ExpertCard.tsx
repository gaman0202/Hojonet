'use client';

import Link from 'next/link';
// import { StarIcon } from '@/components/icons';
import type { Expert } from '../types';

interface ExpertCardProps extends Expert {
  subsidyId: string;
  /** この補助金で既に相談中の専門家ID（assignee_id）。該当する専門家はボタンを「相談中」表示・無効化する */
  consultingExpertId?: string | null;
}

export default function ExpertCard({
  id: expertId,
  name,
  iconUrl,
  rating: _rating, // 별점 미표시 (더미)
  message,
  services,
  office,
  registrationYear,
  registrationNumber,
  subsidyId,
  consultingExpertId = null,
}: ExpertCardProps) {
  const isConsulting = !!consultingExpertId && consultingExpertId === expertId;
  // const fullStars = Math.floor(rating);
  // const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-6 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 pb-3 border-b border-[#E5E7EB]">
        <div className="flex flex-row items-center gap-3 w-full">
          <div className="w-20 h-20 bg-[#E5E7EB] rounded-full flex-shrink-0 overflow-hidden">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F3E8FF]">
                <span className="text-2xl text-[#9810FA]">{(name || '専').trim().charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center items-start gap-1 flex-1">
            <span className="text-xs text-[#101828] leading-[140%] tracking-[-0.15px]">担当専門家</span>
            <h3 className="text-lg font-medium text-[#101828] leading-[140%] tracking-[-0.3125px]">{name}</h3>
            {/* 별점: 더미데이터로 미표시
            <div className="flex flex-row items-center gap-1">
              {[...Array(fullStars)].map((_, i) => (
                <StarIcon key={i} size={16} color="#FDC700" filled={true} />
              ))}
              {hasHalfStar && <StarIcon size={16} color="#D1D5DC" filled={false} />}
              {[...Array(5 - Math.ceil(rating))].map((_, i) => (
                <StarIcon key={fullStars + (hasHalfStar ? 1 : 0) + i} size={16} color="#D1D5DC" filled={false} />
              ))}
              <span className="text-sm text-[#101828] leading-5 tracking-[-0.15px] ml-1">{rating}</span>
            </div>
            */}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 w-full">
          <span className="text-sm font-medium text-[#101828] leading-5 tracking-[-0.15px]">一言メッセージ</span>
          <div className="w-full p-3 bg-[#F3F4F6] rounded-[10px]">
            <p className="text-sm text-[#101828] leading-[140%]">{message}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 w-full">
          <span className="text-sm font-medium text-[#101828] leading-5">主な取扱い業務</span>
          <div className="flex flex-row items-center gap-2 flex-wrap">
            {services.map((service, index) => (
              <div key={index} className="px-2 py-1.5 bg-[#FFEDD4] rounded">
                <span className="text-xs text-[#CA3500] leading-4">{service}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-sm font-medium text-[#101828] leading-5 tracking-[-0.15px]">行政書士事務所</span>
          <span className="text-sm text-[#101828] leading-5 tracking-[-0.15px]">{office}</span>
        </div>
        <div className="flex flex-row items-start gap-3 w-full">
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-medium text-[#101828] leading-5 tracking-[-0.15px]">登録年</span>
            <span className="text-sm text-[#101828] leading-5 tracking-[-0.15px]">{registrationYear}</span>
          </div>
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-medium text-[#101828] leading-5 tracking-[-0.15px]">登録番号</span>
            <span className="text-sm text-[#101828] leading-5 tracking-[-0.15px]">{registrationNumber}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {isConsulting ? (
          <span
            aria-disabled="true"
            className="w-full h-12 bg-[#9CA3AF] rounded-[10px] text-white text-base leading-6 tracking-[-0.3125px] flex items-center justify-center cursor-not-allowed opacity-90"
          >
            相談中
          </span>
        ) : (
          <Link
            href={expertId ? `/hearing/${subsidyId}?expertId=${encodeURIComponent(expertId)}` : `/hearing/${subsidyId}`}
            className="w-full h-12 bg-[#00A63E] rounded-[10px] text-white text-base leading-6 tracking-[-0.3125px] hover:bg-[#008A33] transition-colors flex items-center justify-center"
          >
            専門家に相談する
          </Link>
        )}
        <button className="w-full h-12 bg-[#F3F4F6] rounded-[10px] text-[#99A1AF] text-base leading-6 tracking-[-0.3125px] hover:bg-[#E5E7EB] transition-colors">
          セルフ申請
        </button>
      </div>
    </div>
  );
}
