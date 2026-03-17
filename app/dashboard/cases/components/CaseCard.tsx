import Link from 'next/link';
import Image from 'next/image';
import { CalendarIcon, DocumentIcon, ChatBubbleIcon, ClockIcon } from '@/components/icons';
import { CaseItem } from '../types';

interface CaseCardProps {
  caseItem: CaseItem;
}

export default function CaseCard({ caseItem }: CaseCardProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'consultation':
        return { bg: '#DBEAFE', text: '#155DFC' };
      case 'hearing':
        return { bg: '#FEF9C3', text: '#CA8A04' };
      case 'doc_prep':
        return { bg: '#F3F4F6', text: '#6A7282' };
      case 'doc_review':
        return { bg: '#E5E7EB', text: '#4A5565' };
      case 'submitted':
        return { bg: '#DCFCE7', text: '#00A63E' };
      case 'reviewing':
        return { bg: '#FFEDD4', text: '#EA580C' };
      case 'approved':
        return { bg: '#DCFCE7', text: '#008236' };
      default:
        return { bg: '#F3F4F6', text: '#6A7282' };
    }
  };

  const statusStyle = getStatusStyle(caseItem.status);
  const progressBarColor = caseItem.progress < 30 ? '#CA8A04' : '#155DFC';

  return (
    <Link
      href={`/dashboard/cases/${caseItem.id}`}
      className="flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-3 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px] hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col gap-1 lg:gap-3 w-full">
        {/* Mobile Layout: Vertical stack */}
        <div className="flex flex-col lg:hidden gap-2 w-full">
          {/* Status Tag */}
          <div className="flex flex-row items-center gap-2 flex-nowrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs leading-4 tracking-[-0.150391px] flex items-center gap-1 whitespace-nowrap flex-shrink-0"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {caseItem.statusText}
            </span>
            {caseItem.needsAction && (
              <span
                className="px-2 py-0.5 rounded-full text-xs leading-4 tracking-[-0.150391px] flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                style={{ background: '#FEE2E2', color: '#DC2626' }}
              >
                <Image 
                  src="/icons/exclamation.svg" 
                  alt="exclamation" 
                  width={12} 
                  height={12} 
                  className="w-3 h-3"
                />
                対応必要
              </span>
            )}
          </div>

          {/* Title - Mobile: without status badge */}
          <h3 className="text-base font-medium leading-6 tracking-[-0.3125px] text-[#0A0A0A]">
            {caseItem.title}
          </h3>

          {/* Deadline and Progress */}
          <div className="flex flex-row items-center gap-2 text-sm text-[#6A7282] leading-5 tracking-[-0.150391px]">
            <div className="flex flex-row items-center gap-1">
              <CalendarIcon size={16} color="#6A7282" />
              <span>締切: {caseItem.deadline} {caseItem.daysLeft !== null && `(${caseItem.daysLeft}日後)`}</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 text-sm text-[#6A7282] leading-5 tracking-[-0.150391px]">
            <div className="flex flex-row items-center gap-1">
              <DocumentIcon size={16} color="#6A7282" />
              <span>進捗: {caseItem.progress}%</span>
            </div>
          </div>
          {/* Amount and Badges - Mobile */}
          <div className="flex flex-row justify-between items-end gap-2 w-full mt-auto">
            {(caseItem.taskCount > 0 || caseItem.messageCount > 0) && (
              <div className="flex flex-row items-center gap-2">
                {caseItem.messageCount > 0 && (
                  <div className="flex flex-row items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#DC2626] opacity-20"></div>
                    <span className="text-xs leading-4 text-[#DC2626]">
                      {caseItem.messageCount}件
                    </span>
                  </div>
                )}
                {caseItem.taskCount > 0 && (
                  <div className="flex flex-row items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#EA580C] opacity-20"></div>
                    <span className="text-xs leading-4 text-[#EA580C]">
                      {caseItem.taskCount}件
                    </span>
                  </div>
                )}
              </div>
            )}
            <span className="text-lg font-semibold leading-7 tracking-[-0.439453px] text-[#155DFC] text-right">
              {caseItem.amount}
            </span>
          </div>
        </div>

        {/* Desktop Layout: Horizontal with left/right columns */}
        <div className="hidden lg:flex lg:flex-row lg:justify-between lg:items-start w-full gap-4">
          {/* Left Column */}
          <div className="flex flex-col gap-3 w-auto">
            {/* Status Tags */}
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-sm leading-5 tracking-[-0.150391px] flex items-center gap-1"
                style={{ background: statusStyle.bg, color: statusStyle.text }}
              >
                {caseItem.statusText}
              </span>
              {caseItem.needsAction && (
                <span
                  className="px-3 py-1 rounded-full text-sm leading-5 tracking-[-0.150391px] flex items-center gap-1"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}
                >
                  ⚠ 対応必要
                </span>
              )}
            </div>

            {/* Title with Status Badge */}
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center px-3 py-1 bg-[#155DFC] rounded-full text-sm text-[#DBEAFE] leading-5 tracking-[-0.150391px] font-medium">
                申請案件
              </span>
              <h3 className="text-xl font-medium leading-7 tracking-[-0.449219px] text-[#101828]">
                {caseItem.title}
              </h3>
            </div>

            {/* Deadline and Progress */}
            <div className="flex flex-row items-center gap-4 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">
              <div className="flex flex-row items-center gap-1">
                <CalendarIcon size={16} color="#4A5565" />
                <span>締切: {caseItem.deadline} {caseItem.daysLeft !== null && `(${caseItem.daysLeft}日後)`}</span>
              </div>
              <div className="flex flex-row items-center gap-1">
                <DocumentIcon size={16} color="#4A5565" />
                <span>進捗: {caseItem.progress}%</span>
              </div>
            </div>
          </div>

          {/* Right Column: Amount and Badges */}
          <div className="flex flex-col items-end gap-2 w-auto">
            {/* 支援金額 and Amount */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm text-[#6A7282] leading-5 tracking-[-0.150391px] text-right">
                支援金額
              </span>
              <span className="text-2xl font-medium leading-8 tracking-[0.0703125px] text-[#155DFC] text-right">
                {caseItem.amount}
              </span>
            </div>
            {/* Badges - same height as deadline/progress */}
            {(caseItem.taskCount > 0 || caseItem.messageCount > 0) && (
              <div className="flex flex-row items-center gap-2 h-7">
                {caseItem.messageCount > 0 && (
                  <div className="flex flex-row items-center px-3 py-1.5 gap-2 bg-[#FFE2E2] rounded-[10px] h-7">
                    <ChatBubbleIcon size={16} color="#E7000B" />
                    <span className="text-sm text-[#E7000B] leading-5 tracking-[-0.150391px]">
                      {caseItem.messageCount}件
                    </span>
                  </div>
                )}
                {caseItem.taskCount > 0 && (
                  <div className="flex flex-row items-center px-3 py-1.5 gap-2 bg-[#FFEDD4] rounded-[10px] h-7">
                    <ClockIcon size={16} color="#E7000B" />
                    <span className="text-sm text-[#E7000B] leading-5 tracking-[-0.150391px]">
                      {caseItem.taskCount}件
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${caseItem.progress}%`, background: progressBarColor }}
          />
        </div>

        {/* Assignee - Desktop: Below Progress Bar */}
        <p className="hidden lg:block text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">
          担当: {caseItem.assignee}
        </p>
      {/* Assignee - Mobile */}
        <p className="lg:hidden text-xs font-normal leading-4 text-[#6A7282]">
          担当: {caseItem.assignee}
        </p>
      </div>
    </Link>
  );
}
