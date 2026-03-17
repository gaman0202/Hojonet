import Link from 'next/link';
import { EnvelopeIcon, ChevronRightIcon, FileIcon, PhoneCallIcon } from '@/components/icons';
import { Introducer } from '../types';

interface IntroducerCardProps {
  introducer: Introducer;
}

export default function IntroducerCard({ introducer }: IntroducerCardProps) {
  return (
    <div className="flex flex-col bg-white border border-[#E5E7EB] rounded-[14px] px-7 pt-7 pb-[15px] gap-[7px]">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex flex-row items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'linear-gradient(135deg, #AD46FF 0%, #2B7FFF 100%)' }}
          >
            <div className="w-7 h-7">
              <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Z" />
                <path d="M6 20v-1c0-2.21 2.686-4 6-4s6 1.79 6 4v1" />
              </svg>
            </div>
          </div>
          <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] truncate self-center">
            {introducer.name}
          </p>
        </div>
        <Link href={`/expert/introducers/${introducer.id}`}>
          <ChevronRightIcon size={16} color="#6A7282" />
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px] mt-2 mb-1">
          <div className="w-4 flex-shrink-0">
            <EnvelopeIcon size={16} color="#99A1AF" />
          </div>
          <span className="truncate">{introducer.email}</span>
        </div>
        <div className="flex flex-row items-center gap-2 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px] mb-3">
          <div className="w-4 flex-shrink-0">
            <PhoneCallIcon size={16} color="#99A1AF" />
          </div>
          <span className="truncate">{introducer.phone}</span>
        </div>

        <div className="border-t border-[#E5E7EB]" />

        <div className="flex flex-row items-center gap-2 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px] mt-3 mb-2">
          <div className="w-4 flex-shrink-0">
            <FileIcon size={16} color="#99A1AF" />
          </div>
          <span>紹介顧客リスト</span>
        </div>
        <div className="flex flex-col gap-3">
          {introducer.referredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-col gap-[2px] px-3 py-2 rounded-[8px] bg-[#F5F6F7]"
            >
              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">{customer.name}</span>
              <span className="text-xs font-normal leading-4 text-[#4A5565]">{customer.email}</span>
            </div>
          ))}
          {introducer.othersCount ? (
            <div className="flex flex-row justify-end mt-2">
              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
                他{introducer.othersCount}名
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
