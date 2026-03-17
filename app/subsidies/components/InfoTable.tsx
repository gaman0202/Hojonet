import { TableRow } from '../types';

interface InfoTableProps {
  rows: TableRow[];
}

export function InfoTable({ rows }: InfoTableProps) {
  return (
    <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex flex-col sm:flex-row ${
            index !== rows.length - 1 ? 'border-b border-[#E5E7EB]' : ''
          }`}
        >
          {/* Label Cell */}
          <div className="flex flex-row items-start px-5 sm:px-6 py-3 sm:py-4 lg:py-6 w-full sm:w-[200px] lg:w-[200px] bg-[#EEEEEE] flex-shrink-0">
            <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#364153]">
              {row.label}
            </span>
          </div>
          {/* Value Cell */}
          <div className="flex flex-row items-start px-5 sm:px-6 py-3 sm:py-4 lg:py-6 flex-1 min-w-0">
            {row.isBadge ? (
              <span className="flex flex-row justify-center items-center px-2.5 sm:px-3 py-1 bg-[#DBEAFE] rounded-full">
                <span className="text-xs sm:text-sm font-normal leading-4 text-[#155DFC] whitespace-nowrap">
                  {row.value}
                </span>
              </span>
            ) : row.isLink ? (
              <a
                href={row.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#155DFC] underline hover:opacity-80 transition-opacity break-all sm:break-normal"
              >
                公式サイトへ
              </a>
            ) : (
              <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#101828] break-words">
                {row.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
