'use client';

import { use } from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ExpertCard from '../../components/ExpertCard';
import { ArrowLeftIcon } from '@/components/icons';
import type { Expert } from '../../types';

export default function SubsidyExpertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subsidyId } = use(params);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [subsidyTitle, setSubsidyTitle] = useState('');
  const [consultingExpertId, setConsultingExpertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!subsidyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [expertsRes, subsidyRes, consultingRes] = await Promise.all([
          fetch(`/api/subsidies/${subsidyId}/experts`),
          fetch(`/api/subsidies/${subsidyId}`),
          fetch(`/api/subsidies/${subsidyId}/consulting-expert`),
        ]);
        if (expertsRes.ok) {
          const { experts: list } = await expertsRes.json();
          setExperts(Array.isArray(list) ? list : []);
        }
        if (subsidyRes.ok) {
          const s = await subsidyRes.json();
          setSubsidyTitle(s.title ?? '');
        }
        if (consultingRes.ok) {
          const { assigneeId } = await consultingRes.json();
          setConsultingExpertId(assigneeId ?? null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subsidyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#155DFC]" />
        <p className="mt-4 text-[#4A5565]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full bg-white border-b border-[#E5E7EB]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-20 py-4">
            <Link
              href={`/subsidies/${subsidyId}`}
              className="inline-flex flex-row items-center gap-2 px-4 h-10 rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
            >
              <ArrowLeftIcon size={20} color="#364153" />
              <span className="text-base text-[#364153] leading-6 tracking-[-0.3125px]">補助金詳細に戻る</span>
            </Link>
          </div>
        </section>
        <section className="w-full bg-[#F9FAFB]">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-20 py-6">
            <h1 className="text-xl lg:text-2xl font-bold text-[#101828] mb-2">
              担当専門家一覧
            </h1>
            {subsidyTitle && (
              <p className="text-sm text-[#6A7282] mb-6">{subsidyTitle}</p>
            )}
            {experts.length === 0 ? (
              <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] p-8 text-center text-[#6A7282]">
                担当専門家がいません
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experts.map((expert, index) => (
                  <ExpertCard
                    key={expert.id || index}
                    {...expert}
                    subsidyId={subsidyId}
                    consultingExpertId={consultingExpertId}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
