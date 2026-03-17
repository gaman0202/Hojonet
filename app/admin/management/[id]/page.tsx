'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { ArrowLeftIcon, EditIconAlt } from '@/components/icons';
import { ExpertCard, InfoTable, CheckList } from '../components';
import { createTableRows } from '../data';
import { createClient } from '@/utils/supabase/client';
import { getSubsidyDetail } from '@/lib/admin/subsidies';
import type { GrantDetails } from '../types';
import type { Expert } from '../types';

export default function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [grantDetails, setGrantDetails] = useState<GrantDetails | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const loadDetail = async () => {
      const detail = await getSubsidyDetail(supabase, id);
      if (!detail) {
        setNotFound(true);
        return;
      }
      setGrantDetails(detail as GrantDetails);

      // 参加専門家はAPI経由で取得（expert_subsidy_configs を RLS に左右されず取得）
      const expertsRes = await fetch(`/api/admin/management/${id}/experts`);
      if (expertsRes.ok) {
        const { experts: list } = await expertsRes.json();
        setExperts(Array.isArray(list) ? list : []);
      } else {
        setExperts([]);
      }
    };
    loadDetail().catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <AdminSidebar activeItem="management" />
        <main className="flex flex-col items-center justify-center flex-1 p-8">
          <p className="text-[#4A5565]">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (notFound || !grantDetails) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <AdminSidebar activeItem="management" />
        <main className="flex flex-col items-center justify-center flex-1 p-8 gap-4">
          <p className="text-[#4A5565]">補助金が見つかりませんでした。</p>
          <Link
            href="/admin/management"
            className="text-[#9810FA] hover:underline"
          >
            一覧に戻る
          </Link>
        </main>
      </div>
    );
  }

  const tableRows = createTableRows(grantDetails);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="management" />

      <main className="flex flex-col items-start w-full min-w-0">
        <div className="flex flex-row justify-between items-center px-4 sm:px-6 lg:px-6 py-4 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-3">
            <Link
              href="/admin/management"
              className="flex flex-row items-center justify-center gap-2 px-3 sm:px-4 h-9 sm:h-10 rounded-[10px] hover:bg-gray-50 transition-colors"
            >
              <ArrowLeftIcon size={18} color="#364153" />
              <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#364153]">
                戻る
              </span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-start px-4 sm:px-6 lg:px-6 py-4 sm:py-6 lg:py-6 pb-20 lg:pb-8 gap-4 sm:gap-6 lg:gap-6 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 lg:gap-6 p-4 sm:p-6 lg:px-6 lg:py-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="flex flex-row justify-center items-center w-fit px-2.5 sm:px-3 py-1 bg-[#DBEAFE] rounded-full">
                <span className="text-xs font-normal leading-4 text-[#155DFC] whitespace-nowrap">
                  {grantDetails.status}
                </span>
              </span>
              <h1 className="text-lg sm:text-xl lg:text-[24px] font-bold leading-6 sm:leading-7 lg:leading-8 tracking-[0.0703125px] text-[#101828] break-words">
                {grantDetails.title}
              </h1>
            </div>
            <Link
              href={`/admin/management/${id}/edit`}
              className="flex flex-row items-center justify-center gap-2 px-4 h-9 sm:h-10 lg:h-10 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-5 sm:leading-6 lg:leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
            >
              <EditIconAlt size={18} color="white" className="sm:w-5 sm:h-5 lg:w-5 lg:h-5" />
              <span>内容修正</span>
            </Link>
          </div>

          <InfoTable rows={tableRows} />

          <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 p-4 sm:p-6 lg:px-6 lg:py-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="pb-1 border-b border-[#E5E7EB]">
              <h2 className="text-lg sm:text-xl lg:text-[20px] font-normal leading-6 sm:leading-7 lg:leading-7 tracking-[-0.449219px] text-[#101828]">
                概要
              </h2>
            </div>
            <p className="text-sm sm:text-base font-normal leading-6 sm:leading-[26px] tracking-[-0.3125px] text-[#364153] break-words">
              {grantDetails.overview}
            </p>
          </div>

          <CheckList
            title="対象となる取組"
            items={grantDetails.eligibleActivities}
            iconType="check"
          />

          <CheckList
            title="対象条件"
            items={grantDetails.eligibilityConditions}
            iconType="check"
          />

          <CheckList
            title="必要書類"
            items={grantDetails.requiredDocuments}
            iconType="document"
          />

          <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 p-4 sm:p-6 lg:px-[25px] lg:py-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <h3 className="text-base sm:text-lg lg:text-[18px] font-normal leading-6 sm:leading-7 lg:leading-7 tracking-[-0.439453px] text-[#101828]">
              この案件に参加中の専門家
            </h3>
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:gap-4">
              {experts.length === 0 ? (
                <p className="text-sm text-[#6A7282]">参加中の専門家はいません。</p>
              ) : (
                experts.map((expert) => (
                  <ExpertCard
                    key={expert.id}
                    expert={expert}
                    href={`/admin/management/${id}/experts/${expert.id}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
