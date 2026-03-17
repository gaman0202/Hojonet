'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import {
  ArrowLeftIcon,
  CheckIcon,
  DocumentIcon,
} from '@/components/icons';

type SubsidyDetail = {
  status: string;
  title: string;
  implementingOrganization: string;
  region: string;
  amount: string;
  applicationPeriod: string;
  subsidyRate: string;
  purpose: string;
  targetIndustries: string;
  officialPage: string;
  overview: string;
  eligibleActivities: string[];
  eligibilityConditions: string[];
  requiredDocuments: string[];
};

export default function ExpertSearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subsidyId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId') ?? '';

  const [detail, setDetail] = useState<SubsidyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [participating, setParticipating] = useState(false);
  const [participateError, setParticipateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [alreadyParticipating, setAlreadyParticipating] = useState(false);

  useEffect(() => {
    if (!subsidyId) {
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/subsidies/${subsidyId}`);
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setDetailError(data.error ?? '取得に失敗しました');
          setDetail(null);
          return;
        }
        const data: SubsidyDetail = await res.json();
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setDetailError('取得に失敗しました');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subsidyId]);

  useEffect(() => {
    if (!subsidyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/expert/subsidies');
        if (cancelled) return;
        if (!res.ok) {
          setAlreadyParticipating(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const list = (data.subsidies ?? []) as { id: number }[];
        const idNum = parseInt(subsidyId, 10);
        if (!cancelled) setAlreadyParticipating(list.some((s) => s.id === idNum));
      } catch {
        if (!cancelled) setAlreadyParticipating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subsidyId]);

  const handleParticipate = async () => {
    if (!subsidyId) return;
    setParticipateError(null);
    setParticipating(true);
    try {
      const res = await fetch(`/api/expert/subsidies/${subsidyId}/participate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '参加に失敗しました');
      router.push('/expert/management');
    } catch (e) {
      setParticipateError(e instanceof Error ? e.message : '参加に失敗しました');
    } finally {
      setParticipating(false);
    }
  };

  const handleCreateCaseForCustomer = async () => {
    if (!subsidyId || !customerId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/expert/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subsidyId: Number(subsidyId), customerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '案件の作成に失敗しました');
      router.push(`/expert/management/${subsidyId}/${data.caseId}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '案件の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const grantDetails = detail
    ? {
        status: detail.status,
        title: detail.title,
        applicationStatus: detail.status,
        implementingOrganization: detail.implementingOrganization,
        region: detail.region,
        grantAmount: detail.amount,
        applicationPeriod: detail.applicationPeriod,
        subsidyRate: detail.subsidyRate,
        purpose: detail.purpose,
        targetIndustry: detail.targetIndustries,
        officialPage: detail.officialPage,
        overview: detail.overview,
        eligibleActivities: detail.eligibleActivities ?? [],
        eligibilityConditions: detail.eligibilityConditions ?? [],
        requiredDocuments: detail.requiredDocuments ?? [],
      }
    : null;

  const tableRows = grantDetails
    ? [
        { label: '公募ステータス', value: grantDetails.applicationStatus, isBadge: true },
        { label: '実施機関', value: grantDetails.implementingOrganization },
        { label: '地域', value: grantDetails.region },
        { label: '補助金額', value: grantDetails.grantAmount },
        { label: '申請期間', value: grantDetails.applicationPeriod },
        { label: '補助率', value: grantDetails.subsidyRate },
        { label: '目的', value: grantDetails.purpose },
        { label: '対象業種', value: grantDetails.targetIndustry },
        { label: '公式公募ページ', value: grantDetails.officialPage, isLink: true },
      ]
    : [];

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="search" />

      {/* Main Content */}
      <main className="flex flex-col items-start w-full min-w-0 lg:ml-[255px]">
        {/* Header with Back Button - padding: 16px 1010.38px 1px 24px, height: 73px */}
        <div className="flex flex-row items-center px-6 pt-4 pb-6 gap-2 w-full bg-white border-b border-[#E5E7EB]">
          <Link
            href={customerId ? `/expert/search?customerId=${encodeURIComponent(customerId)}` : '/expert/search'}
            className="flex flex-row items-center px-4 py-0 gap-2 h-10 rounded-[10px] hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon size={20} color="#364153" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153] text-center">
              戻る
            </span>
          </Link>
        </div>

        {customerId && (
          <div className="mx-4 lg:mx-6 mt-2 rounded-[10px] bg-[#EFF6FF] border border-[#DBEAFE] px-4 py-3">
            <p className="text-sm font-normal leading-5 text-[#155DFC]">
              選択した顧客で新規案件を作成します。
            </p>
          </div>
        )}
        {/* Content Container - padding: 0px, gap: 16px */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-6 gap-4 w-full min-w-0">
          {detailLoading && (
            <div className="flex items-center justify-center py-12 w-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#155DFC]" />
            </div>
          )}
          {detailError && !detailLoading && (
            <div className="w-full py-8 text-center text-[#C10007]">{detailError}</div>
          )}
          {grantDetails && !detailLoading && (
            <>
          {/* Title Card - padding: 24px, gap: 8px */}
          <div className="flex flex-col items-start p-4 lg:p-6 gap-2 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <span className="flex flex-row justify-center items-center px-3 py-1 bg-[#DBEAFE] rounded-full text-xs font-normal leading-4 text-[#155DFC]">
              {grantDetails.status}
            </span>
            <h1 className="text-lg lg:text-2xl font-bold leading-7 lg:leading-8 tracking-[0.0703125px] text-[#101828]">
              {grantDetails.title}
            </h1>
          </div>

          {/* Detail Information Table - padding: 0px */}
          <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
            {tableRows.map((row, index) => (
              <div
                key={index}
                className={`flex flex-col lg:flex-row w-full min-h-[72px] lg:h-[72px] ${
                  index < tableRows.length - 1 ? 'border-b border-[#E5E7EB]' : ''
                }`}
              >
                {/* Label Cell - width: 200px, padding: 24px, items-end */}
                <div className="flex flex-row items-end px-4 lg:px-6 py-4 lg:py-6 w-full lg:w-[200px] bg-[#EEEEEE] flex-shrink-0">
                  <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#364153]">
                    {row.label}
                  </span>
                </div>
                {/* Value Cell - flex-1, padding: 24px, items-start */}
                <div className="flex flex-row items-start px-4 lg:px-6 py-4 lg:py-6 flex-1 min-w-0">
                  {row.isBadge ? (
                    <span className="flex flex-row justify-center items-center px-3 py-1 bg-[#DBEAFE] rounded-full text-sm font-normal leading-4 text-[#155DFC]">
                      {row.value}
                    </span>
                  ) : row.isLink ? (
                    <a
                      href={row.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#155DFC] underline hover:text-[#1248C4] transition-colors break-all"
                    >
                      公式サイトへ
                    </a>
                  ) : (
                    <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] break-words">
                      {row.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overview Section - padding: 24px, gap: 12px */}
          <div className="flex flex-col items-start p-4 lg:p-6 gap-3 w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="flex flex-col gap-1 w-full pb-1 border-b border-[#E5E7EB]">
              <h2 className="text-lg lg:text-xl font-normal leading-7 tracking-[-0.439453px] text-[#101828]">
                概要
              </h2>
            </div>
            <p className="w-full min-w-0 text-sm lg:text-base font-normal leading-6 lg:leading-[26px] tracking-[-0.3125px] text-[#364153] break-words">
              {grantDetails.overview}
            </p>
          </div>

          {/* Eligible Activities Section - padding: 24px, gap: 12px */}
          <div className="flex flex-col items-start p-4 lg:p-6 gap-3 w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[14px]">
            <h2 className="text-base lg:text-lg font-normal leading-6 lg:leading-7 tracking-[-0.439453px] text-[#101828]">
              対象となる取組
            </h2>
            <div className="flex flex-col gap-2 w-full min-w-0">
              {grantDetails.eligibleActivities.map((activity, index) => (
                <div key={index} className="flex flex-row items-start gap-2 min-h-6 min-w-0">
                  <div className="flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
                    <CheckIcon size={20} color="#00A63E" />
                  </div>
                  <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#364153] break-words min-w-0">
                    {activity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility Conditions Section - padding: 24px, gap: 12px */}
          <div className="flex flex-col items-start p-4 lg:p-6 gap-3 w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[14px]">
            <h2 className="text-base lg:text-lg font-normal leading-6 lg:leading-7 tracking-[-0.439453px] text-[#101828]">
              対象条件
            </h2>
            <div className="flex flex-col gap-2 w-full min-w-0">
              {grantDetails.eligibilityConditions.map((condition, index) => (
                <div key={index} className="flex flex-row items-start gap-2 min-h-6 min-w-0">
                  <div className="flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
                    <CheckIcon size={20} color="#00A63E" />
                  </div>
                  <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#364153] break-words min-w-0">
                    {condition}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Required Documents Section - padding matched top/bottom */}
          <div className="flex flex-col items-start p-4 lg:p-6 gap-4 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <h3 className="text-base lg:text-lg font-normal leading-6 lg:leading-7 tracking-[-0.439453px] text-[#101828]">
              必要書類
            </h3>
            <div className="flex flex-col gap-3 w-full">
              {grantDetails.requiredDocuments.map((document, index) => (
                <div key={index} className="flex flex-row items-start gap-2 min-h-6">
                  <div className="flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
                    <DocumentIcon size={20} color="#155DFC" />
                  </div>
                  <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#364153]">
                    {document}
                  </span>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Bottom Action Section - small bottom padding so text isn't flush */}
        <div className="flex flex-col items-start px-6 lg:px-[49.5px] pt-4 lg:pt-6 pb-4 lg:pb-4 gap-3 w-full bg-white border-t border-[#E5E7EB]">
          {(participateError || createError) && (
            <p className="text-sm text-red-600 w-full">{participateError || createError}</p>
          )}
          {customerId ? (
            <button
              type="button"
              onClick={handleCreateCaseForCustomer}
              disabled={creating || !grantDetails || !!detailError}
              className="w-full h-14 bg-gradient-to-r from-[#9810FA] to-[#155DFC] rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-white">
                {creating ? '作成中...' : 'この顧客で、この補助金の案件を作成する'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleParticipate}
              disabled={participating || alreadyParticipating || !grantDetails || !!detailError}
              className={`w-full h-14 rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] transition-opacity disabled:cursor-not-allowed ${
                alreadyParticipating
                  ? 'bg-[#E5E7EB] opacity-90 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#9810FA] to-[#155DFC] hover:opacity-90 disabled:opacity-60'
              }`}
            >
              <span className={`text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] ${alreadyParticipating ? 'text-[#6A7282]' : 'text-white'}`}>
                {participating ? '参加中...' : alreadyParticipating ? '既に参加しています' : 'この補助金の案件に参加する'}
              </span>
            </button>
          )}
          <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#6A7282] text-center w-full">
            {customerId
              ? '作成した案件は案件管理ページで確認できます'
              : '参加した補助金案件は案件管理ページに登録されます'}
          </p>
        </div>
      </main>
    </div>
  );
}
