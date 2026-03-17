import Link from 'next/link';
import { LocationIcon, CalendarIcon, BuildingIcon } from '@/components/icons';
import type { Subsidy } from '@/app/subsidies/types';

interface SubsidyCardProps {
  subsidy: Subsidy;
}

export default function SubsidyCard({ subsidy }: SubsidyCardProps) {
  return (
    <Link
      href={`/subsidies/${subsidy.id}`}
      className="flex flex-col items-start w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Row 1: Badge */}
      {subsidy.statusTags?.length > 0 && (
        <div className="flex flex-row items-center gap-1.5 flex-wrap mb-1 sm:mb-1">
          {subsidy.statusTags.map((tag, index) => (
            <div
              key={index}
              className={`inline-flex items-center justify-center h-5 sm:h-6 px-2 sm:px-2.5 py-0.5 rounded-full ${
                tag === '公募中' ? 'bg-[#DBEAFE]' : 'bg-[#FFE2E2]'
              }`}
            >
              {tag === '締切間近' && (
                <img src="/icons/exclamation.svg" alt="締切間近" className="mr-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
              <span className={`text-[11px] sm:text-xs leading-4 ${tag === '公募中' ? 'text-[#155DFC]' : 'text-[#E7000B]'}`}>
                {tag}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Title */}
      <h3
        className="w-full text-base sm:text-[18px] font-bold text-[#101828] leading-6 sm:leading-7 tracking-[-0.439px] mb-1"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {subsidy.title}
      </h3>

      {/* Row 3: Location + Deadline */}
      <div className="flex flex-row items-center flex-wrap gap-x-3 sm:gap-x-5 gap-y-1.5 w-full mb-2 sm:mb-3">
        {subsidy.implementingOrganization && (
          <div className="flex flex-row items-center gap-1 sm:gap-1.5 min-w-0">
            <BuildingIcon size={16} color="#4A5565" className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-[#4A5565] leading-5 tracking-[-0.15px] truncate">
              {subsidy.implementingOrganization}
            </span>
          </div>
        )}
        <div className="flex flex-row items-center gap-1 sm:gap-1.5 min-w-0">
          <LocationIcon size={16} color="#4A5565" className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-[#4A5565] leading-5 tracking-[-0.15px] truncate">
            {subsidy.location}
          </span>
        </div>
        <div className="flex flex-row items-center gap-1 sm:gap-1.5 min-w-0">
          <CalendarIcon size={16} color={subsidy.deadlineColor} className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span
            className="text-xs sm:text-sm leading-5 tracking-[-0.15px] truncate"
            style={{ color: subsidy.deadlineColor }}
          >
            {subsidy.deadline}
          </span>
        </div>
      </div>

      {/* Row 4: Amount */}
      <div
        className="text-xl sm:text-2xl font-bold text-[#155DFC] leading-6 sm:leading-7 tracking-[-0.449px] mb-2 sm:mb-3"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {subsidy.amount}
      </div>

      {/* Row 5: Overview */}
      {subsidy.overview && (
        <p className="w-full text-xs sm:text-sm text-[#4A5565] leading-5 tracking-[-0.15px] line-clamp-2">
          {subsidy.overview}
        </p>
      )}
    </Link>
  );
}
