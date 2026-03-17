import Link from 'next/link';
import {
  BuildingIcon,
  LocationIcon,
  ArrowRightIcon,
  FileIcon,
  EnvelopeIcon,
  PhoneCallIcon,
  MailIcon,
} from '@/components/icons';
import { Customer } from '../types';

interface CustomerCardProps {
  customer: Customer;
  isLast?: boolean;
}

export default function CustomerCard({ customer, isLast = false }: CustomerCardProps) {
  return (
    <div
      className={`flex flex-row items-center gap-4 px-5 py-5 min-w-0 ${
        !isLast ? 'border-b border-[#E5E7EB]' : ''
      }`}
    >
      {/* Avatar (데스크톱만) */}
      <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-[#F3E8FF] rounded-full flex-shrink-0">
        <span className="text-lg font-normal leading-7 tracking-[-0.439453px] text-[#9810FA]">
          {customer.nameInitial}
        </span>
      </div>

      <div className="flex flex-row flex-grow gap-4 min-w-0">
        <div className="flex flex-col flex-grow gap-1 text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] min-w-0">
          {/* 1행: 이름 (모바일에서 아바타·상태·화살표 포함) */}
          <div className="flex items-center gap-2 w-full mb-2">
            <div className="sm:hidden flex items-center justify-center w-9 h-9 bg-[#F3E8FF] rounded-full text-lg font-normal leading-7 tracking-[-0.439453px] text-[#9810FA] flex-shrink-0">
              {customer.nameInitial}
            </div>
            <span className="text-lg font-normal leading-7 tracking-[-0.439453px] text-[#101828] flex-1 min-w-0 truncate">
              {customer.name}
            </span>
            <div className="ml-auto flex items-center gap-2.5 sm:hidden flex-shrink-0">
              <div className="flex items-center justify-center rounded-full bg-[#DCFCE7] px-2.5 py-1.5">
                <span className="text-xs font-normal leading-4 text-[#008236] whitespace-nowrap">
                  進行中 {customer.activeCases}件
                </span>
              </div>
              <Link
                href={`/expert/customers/${customer.id}`}
                className="flex items-center justify-center"
                aria-label={`${customer.name}詳細`}
              >
                <ArrowRightIcon size={20} color="#99A1AF" />
              </Link>
            </div>
          </div>

          {/* 데스크톱: 5열 그리드 (최소값 완화로 중간 해상도에서도 넘치지 않게) */}
          <div
            className="hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(70px,auto)] items-center text-sm gap-x-4 lg:gap-x-6 min-w-0"
            role="row"
          >
            <div className="flex flex-row items-center gap-2 min-w-0" role="cell">
              <EnvelopeIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{customer.email}</span>
            </div>
            <div className="flex flex-row items-center gap-2 min-w-0" role="cell">
              <PhoneCallIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{customer.phone}</span>
            </div>
            <div className="flex flex-row items-center gap-2 min-w-0" role="cell">
              <FileIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{customer.industry}</span>
            </div>
            <div className="flex flex-row items-center gap-2 min-w-0" role="cell">
              <LocationIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{customer.location}</span>
            </div>
            <div className="flex flex-row items-center gap-3 justify-end min-w-0" role="cell">
              <div className="flex items-center justify-center rounded-full bg-[#DCFCE7] px-2.5 py-1.5">
                <span className="text-xs font-normal leading-4 text-[#008236]">
                  進行中 {customer.activeCases}件
                </span>
              </div>
              <Link
                href={`/expert/customers/${customer.id}`}
                className="flex items-center justify-center"
                aria-label={`${customer.name}詳細`}
              >
                <ArrowRightIcon size={20} color="#99A1AF" />
              </Link>
            </div>
          </div>

          {/* 모바일: 세로 리스트 */}
          <div className="flex flex-col gap-1.5 sm:hidden mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <MailIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{customer.email}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <PhoneCallIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <BuildingIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{customer.industry}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <LocationIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{customer.location}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <BuildingIcon size={16} color="#99A1AF" className="flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{customer.company}</span>
            </div>
          </div>

          {/* 데스크톱: 회사명 (그리드 아래) */}
          <div className="hidden sm:flex mt-1 flex-row items-center gap-2 text-sm">
            <BuildingIcon size={16} color="#99A1AF" />
            <span className="min-w-0 truncate">{customer.company}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
