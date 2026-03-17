'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import SubsidyCard from '@/app/components/SubsidyCard';
import type { Subsidy } from '@/app/subsidies/types';

const DISPLAY_LIMIT = 6;

export default function HomeSubsidyList() {
  const [list, setList] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/subsidies');
        if (cancelled) return;
        if (!res.ok) {
          setList([]);
          return;
        }
        const data: Subsidy[] = await res.json();
        const openOnly = (data ?? []).filter((s) => s.statusTags?.includes('公募中'));
        setList(openOnly.slice(0, DISPLAY_LIMIT));
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="w-full bg-white">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-6 py-12 sm:py-16 lg:py-20 flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-medium text-[#101828] leading-8 sm:leading-9 lg:leading-[40px] tracking-[0.369px] text-center px-4">
          募集中の補助金事業
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12 w-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#155DFC]" />
          </div>
        ) : (
          <div className="flex flex-col items-start w-full gap-4 sm:gap-6">
            {list.length === 0 ? (
              <p className="w-full text-center text-[#4A5565] py-8">現在募集中の補助金はありません。</p>
            ) : (
              list.map((subsidy) => (
                <SubsidyCard key={subsidy.id} subsidy={subsidy} />
              ))
            )}
          </div>
        )}

        <Link
          href="/subsidies"
          className="flex items-center justify-center gap-2 w-full sm:w-[174.88px] h-12 sm:h-[52px] border-2 border-[#D1D5DC] rounded-[10px] hover:border-[var(--color-primary)] transition-colors"
        >
          <span className="text-sm sm:text-base font-normal text-[#364153] leading-5 sm:leading-6 tracking-[-0.3125px]">
            すべて見る
          </span>
          <ArrowRightIcon size={18} color="#364153" />
        </Link>
      </div>
    </section>
  );
}
