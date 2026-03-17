'use client';

import { useState } from 'react';

export interface MasterRow {
  id: number;
  name: string;
  code?: string;
}

export function MasterTable({
  title,
  count,
  icon: IconComponent,
  rows,
  emptyMessage,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  rows: MasterRow[];
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayRows = expanded ? rows : rows.slice(0, 5);
  const hasMore = rows.length > 5;

  return (
    <div className="flex flex-col bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <div className="flex flex-row items-center gap-2">
          <IconComponent size={20} color="#6A7282" />
          <span className="text-base font-normal leading-6 text-[#101828]">{title}</span>
          <span className="text-sm text-[#6A7282]">({count}件)</span>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-[#9810FA] hover:underline"
          >
            {expanded ? '閉じる' : 'すべて表示'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
        {displayRows.length === 0 ? (
          <p className="p-4 text-sm text-[#6A7282]">{emptyMessage}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="text-left py-2 px-3 text-[#6A7282] font-normal">名前</th>
                <th className="text-left py-2 px-3 text-[#6A7282] font-normal">コード</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => (
                <tr key={r.id} className="border-b border-[#E5E7EB] last:border-0">
                  <td className="py-2 px-3 text-[#101828]">{r.name}</td>
                  <td className="py-2 px-3 text-[#6A7282]">{r.code ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
