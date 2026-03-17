'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { ArrowLeftIcon } from '@/components/icons';
import { createClient } from '@/utils/supabase/client';

export default function AdminExpertDetailPage({
  params,
}: {
  params: Promise<{ id: string; expertId: string }>;
}) {
  const { id: subsidyId, expertId } = use(params);
  const subsidyIdNum = parseInt(subsidyId, 10);
  const trimmedExpertId = expertId?.trim() ?? '';
  const hasInvalidParams = Number.isNaN(subsidyIdNum) || !trimmedExpertId;

  const [subsidyTitle, setSubsidyTitle] = useState<string>('');
  const [expert, setExpert] = useState<{
    full_name: string;
    email: string;
    company_name: string | null;
    phone: string | null;
    user_type: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(!hasInvalidParams);
  const [notFound, setNotFound] = useState(hasInvalidParams);

  useEffect(() => {
    if (hasInvalidParams) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const fetchExpert = async () => {
      try {
        const { data: config } = await supabase
          .from('expert_subsidy_configs')
          .select('expert_id')
          .eq('subsidy_id', subsidyIdNum)
          .eq('expert_id', trimmedExpertId)
          .maybeSingle();

        if (!config) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        const [{ data: subsidy }, { data: profile }] = await Promise.all([
          supabase.from('subsidies').select('title').eq('id', subsidyIdNum).single(),
          supabase
            .from('profiles')
            .select('full_name, email, company_name, phone, user_type')
            .eq('id', trimmedExpertId)
            .single(),
        ]);

        if (!profile) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;

        setSubsidyTitle((subsidy?.title as string) || '補助金');
        setExpert({
          full_name: (profile.full_name as string) ?? '—',
          email: (profile.email as string) ?? '—',
          company_name: (profile.company_name as string | null) ?? null,
          phone: (profile.phone as string | null) ?? null,
          user_type: (profile.user_type as string | null) ?? null,
        });
        setLoading(false);
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    fetchExpert();

    return () => {
      cancelled = true;
    };
  }, [hasInvalidParams, subsidyIdNum, trimmedExpertId]);

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

  if (notFound || !expert) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <AdminSidebar activeItem="management" />
        <main className="flex flex-col items-center justify-center flex-1 p-8 gap-4">
          <p className="text-[#4A5565]">専門家が見つかりませんでした。</p>
          <Link href={`/admin/management/${subsidyId}`} className="text-[#9810FA] hover:underline">
            補助金詳細に戻る
          </Link>
        </main>
      </div>
    );
  }

  const userTypeLabel: Record<string, string> = {
    expert: '専門家',
    assistant: 'アシスタント',
    admin: '管理者',
    customer: '申請者',
    member: 'メンバー',
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="management" />

      <main className="flex flex-col items-start w-full min-w-0">
        <div className="flex flex-row items-center gap-3 px-4 sm:px-6 lg:px-6 py-4 w-full bg-white border-b border-[#E5E7EB]">
          <Link
            href={`/admin/management/${subsidyId}`}
            className="flex flex-row items-center justify-center gap-2 px-3 sm:px-4 h-9 sm:h-10 rounded-[10px] hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon size={18} color="#364153" />
            <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#364153]">
              戻る
            </span>
          </Link>
          <span className="text-sm text-[#6A7282] truncate">{subsidyTitle} — 参加専門家</span>
        </div>

        <div className="flex flex-col items-start px-4 sm:px-6 lg:px-6 py-6 w-full max-w-[800px]">
          <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
            <div className="flex flex-row items-center gap-4 p-4 sm:p-6 border-b border-[#E5E7EB]">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#F3E8FF] flex-shrink-0">
                <span className="text-xl font-medium text-[#9810FA]">
                  {(expert.full_name || '担').trim().charAt(0) || '担'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className="text-xl font-semibold text-[#101828] truncate">{expert.full_name}</h1>
                {expert.user_type && (
                  <span className="text-xs text-[#6A7282]">
                    {userTypeLabel[expert.user_type] ?? expert.user_type}
                  </span>
                )}
              </div>
            </div>
            <dl className="divide-y divide-[#E5E7EB]">
              <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
                <dt className="text-sm font-normal text-[#6A7282] w-full sm:w-[140px] flex-shrink-0">メール</dt>
                <dd className="text-sm text-[#101828] break-all">{expert.email}</dd>
              </div>
              {expert.company_name != null && expert.company_name !== '' && (
                <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
                  <dt className="text-sm font-normal text-[#6A7282] w-full sm:w-[140px] flex-shrink-0">会社名</dt>
                  <dd className="text-sm text-[#101828]">{expert.company_name}</dd>
                </div>
              )}
              {expert.phone != null && expert.phone !== '' && (
                <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
                  <dt className="text-sm font-normal text-[#6A7282] w-full sm:w-[140px] flex-shrink-0">電話番号</dt>
                  <dd className="text-sm text-[#101828]">{expert.phone}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
