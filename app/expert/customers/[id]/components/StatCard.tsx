import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
}

export default function StatCard({ icon, label, value, valueColor = '#101828' }: StatCardProps) {
  return (
    <div className="flex flex-col items-start p-4 sm:p-[17px] gap-2 bg-white border border-[#E5E7EB] rounded-[10px] flex-1 min-w-0">
      <div className="flex flex-row items-center gap-2">
        {icon}
        <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
          {label}
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-normal leading-7 sm:leading-8 tracking-[0.0703125px]" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}
