import Link from 'next/link';
import { CalendarIcon, ClockIcon, DocumentIcon } from '@/components/icons';
import { Case } from '../types';

interface CaseCardProps {
  caseData: Case;
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const href = caseData.subsidyId != null
    ? `/expert/management/${caseData.subsidyId}/${caseData.id}`
    : undefined;
  const content = (
    <>
      {/* Introducer Section */}
      {caseData.introducer && (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 flex-shrink-0 w-full sm:w-auto sm:pr-6 items-center">
            <span className="px-2.5 py-1 bg-[#FFE2E2] rounded-[6px] text-xs font-normal leading-4 text-[#DC2626] whitespace-nowrap row-start-1 row-end-3 self-center">
              紹介者
            </span>
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] whitespace-nowrap row-start-1">
              {caseData.introducer.name}
            </span>
            <span className="text-xs font-normal leading-4 text-[#4A5565] row-start-2">
              {caseData.introducer.email}
            </span>
          </div>
          {/* Separator */}
          <div className="hidden sm:block w-px bg-[#D1D5DC] mx-6 flex-shrink-0 self-stretch"></div>
          <div className="block sm:hidden w-full h-px bg-[#D1D5DC]"></div>
        </>
      )}
      
      {/* Case Details Section */}
      <div className="flex flex-col gap-2 flex-grow min-w-0 w-full sm:w-auto">
        <div className="flex flex-row items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 bg-[#F3F4F6] rounded-[6px] text-xs font-normal leading-4 text-[#364153] flex-shrink-0">
            {caseData.tag}
          </span>
          <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] break-words">
            {caseData.title}
          </h3>
        </div>
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <div className="flex flex-row items-center gap-1">
            <CalendarIcon size={16} color="#4A5565" className="flex-shrink-0" />
            <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              締切: {caseData.deadline}
            </span>
          </div>
          <div className="flex flex-row items-center gap-1">
            <DocumentIcon size={16} color="#4A5565" className="flex-shrink-0" />
            <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              進捗: {caseData.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Support Amount Section */}
      {caseData.amount && (
        <div className="flex flex-col gap-1 flex-shrink-0 w-full sm:w-auto sm:ml-auto text-right">
          <span className="text-sm font-normal leading-5 text-[#6A7282]">
            支援金額
          </span>
          <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#2B7FFF]">
            {caseData.amount}
          </span>
        </div>
      )}
    </>
  );
  const className = 'flex flex-col sm:flex-row items-start px-4 sm:px-6 py-4 sm:py-6 border-b border-[#E5E7EB] last:border-b-0 sm:gap-0';
  if (href) {
    return (
      <Link href={href} className={`${className} hover:bg-[#F9FAFB] transition-colors block`}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
