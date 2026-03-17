'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { InfoTable } from '../components/InfoTable';
import ExpertCard from '../components/ExpertCard';
import { ArrowLeftIcon, CheckCircleIcon, DocumentIcon } from '@/components/icons';
import { SAMPLE_SUBSIDY_DETAILS, createTableRows } from '../data';
import { SubsidyDetails, Expert } from '../types';

export default function SubsidyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const subsidyId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

  const [subsidyData, setSubsidyData] = useState<SubsidyDetails>(SAMPLE_SUBSIDY_DETAILS);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [consultingExpertId, setConsultingExpertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!subsidyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subsidyRes, expertsRes, consultingRes] = await Promise.all([
          fetch(`/api/subsidies/${subsidyId}`),
          fetch(`/api/subsidies/${subsidyId}/experts`),
          fetch(`/api/subsidies/${subsidyId}/consulting-expert`),
        ]);

        if (subsidyRes.ok) {
          const subsidy = await subsidyRes.json();
          setSubsidyData(subsidy);
          setNotFound(false);
        } else if (subsidyRes.status === 404) {
          setNotFound(true);
        }

        if (expertsRes.ok) {
          const { experts: list } = await expertsRes.json();
          setExperts(Array.isArray(list) ? list : []);
        }

        if (consultingRes.ok) {
          const { assigneeId } = await consultingRes.json();
          setConsultingExpertId(assigneeId ?? null);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subsidyId]);

  const tableRows = createTableRows(subsidyData);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#155DFC]"></div>
        <p className="mt-4 text-[#4A5565]">読み込み中...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-[#4A5565]">該当する補助金が見つかりませんでした。</p>
          <button
            onClick={() => router.back()}
            className="flex flex-row items-center gap-2 px-4 py-2.5 bg-[#155DFC] text-white rounded-[10px] hover:bg-[#1346c7]"
          >
            <ArrowLeftIcon size={20} color="#FFFFFF" />
            <span>戻る</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1">
        {/* Back Button Header */}
        <section className="w-full bg-white border-b border-[#E5E7EB]">
          <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-20 py-4">
            <button
              onClick={() => router.back()}
              className="flex flex-row items-center gap-2 px-4 h-10 rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
            >
              <ArrowLeftIcon size={20} color="#364153" />
              <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px]">戻る</span>
            </button>
          </div>
        </section>

        {/* Main Content */}
        <section className="w-full bg-[#F9FAFB]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-20 py-6">
            <div className="w-full flex flex-col lg:flex-row items-start gap-6 lg:max-w-[1280px] lg:mx-auto min-w-0">
              {/* Left Column - Subsidy Details */}
              <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
                {/* Title Card */}
                <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col gap-2">
                  <div className="inline-flex items-center justify-center w-fit h-7 px-3 py-1 bg-[#DBEAFE] rounded-full">
                    <span className="text-xs text-[#155DFC] leading-4 whitespace-nowrap">{subsidyData.status}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#101828] leading-8 tracking-[0.07px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {subsidyData.title}
                  </h1>
                </div>

                {/* Information Table */}
                <InfoTable rows={tableRows} />

                {/* Overview Section */}
                <div className="w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col gap-3">
                  <div className="pb-1 border-b border-[#E5E7EB]">
                    <h2 className="text-xl text-[#101828] leading-7 tracking-[-0.449px]">概要</h2>
                  </div>
                  <p className="w-full min-w-0 text-base text-[#364153] leading-[26px] tracking-[-0.3125px] break-words">{subsidyData.overview}</p>
                </div>

                {/* Eligible Activities Section */}
                <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col gap-3">
                  <h2 className="text-lg text-[#101828] leading-7 tracking-[-0.439px]">対象となる取組</h2>
                  <div className="flex flex-col gap-2">
                    {subsidyData.eligibleActivities.map((activity, index) => (
                      <div key={index} className="flex flex-row items-center gap-2">
                        <CheckCircleIcon size={20} color="#00A63E" />
                        <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px] break-words">{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eligibility Conditions Section */}
                <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col gap-3">
                  <h2 className="text-lg text-[#101828] leading-7 tracking-[-0.439px]">対象条件</h2>
                  <div className="flex flex-col gap-2">
                    {subsidyData.eligibilityConditions.map((condition, index) => (
                      <div key={index} className="flex flex-row items-center gap-2">
                        <CheckCircleIcon size={20} color="#00A63E" />
                        <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px] break-words">{condition}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required Documents Section */}
                <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col gap-3">
                  <h2 className="text-lg text-[#101828] leading-7 tracking-[-0.439px]">必要書類</h2>
                  <div className="flex flex-col gap-3">
                    {subsidyData.requiredDocuments.map((document, index) => (
                      <div key={index} className="flex flex-row items-center gap-2">
                        <DocumentIcon size={20} color="#155DFC" />
                        <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px] break-words">{document}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Expert Cards */}
              <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-6">
                {experts.length === 0 ? (
                  <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-6 flex flex-col items-center justify-center gap-2 min-h-[200px]">
                    <p className="text-base text-[#6A7282] text-center">担当専門家がいません</p>
                  </div>
                ) : (
                  <>
                    {experts.slice(0, 3).map((expert, index) => (
                      <ExpertCard
                        key={expert.id || index}
                        {...expert}
                        subsidyId={subsidyId}
                        consultingExpertId={consultingExpertId}
                      />
                    ))}
                    {experts.length >= 4 && (
                      <Link
                        href={`/subsidies/${subsidyId}/experts`}
                        className="w-full h-12 flex items-center justify-center border-2 border-[#9810FA] rounded-[10px] text-[#9810FA] text-sm font-medium hover:bg-[#FAF5FF] transition-colors"
                      >
                        すべて見る
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
