import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { Expert } from '../types';

interface ExpertCardProps {
  expert: Expert;
  href: string;
}

export function ExpertCard({ expert, href }: ExpertCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-row justify-between items-center px-3 sm:px-4 lg:px-4 py-3 sm:py-4 lg:py-4 gap-3 sm:gap-4 lg:gap-4 w-full bg-[#F9FAFB] rounded-[10px] hover:bg-gray-100 transition-colors"
    >
      <div className="flex flex-row items-center gap-2.5 sm:gap-3 lg:gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-10 lg:h-10 bg-[#F3E8FF] rounded-full flex-shrink-0">
          <span className="text-xs sm:text-sm font-normal leading-4 sm:leading-5 lg:leading-5 tracking-[-0.150391px] text-[#9810FA]">
            {expert.avatarChar}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 lg:gap-0 flex-1 min-w-0">
          <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] truncate">
            {expert.name}
          </p>
          <p className="text-xs font-normal leading-4 text-[#4A5565] truncate sm:break-normal">
            {expert.email}
          </p>
        </div>
      </div>
      <ArrowRightIcon size={14} color="#99A1AF" className="sm:w-4 sm:h-4 lg:w-4 lg:h-4 flex-shrink-0" />
    </Link>
  );
}
