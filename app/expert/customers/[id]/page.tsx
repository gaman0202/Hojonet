'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import {
  ArrowLeftIcon,
  PhoneCallIcon,
  BuildingIcon,
  LocationIcon,
  DocumentIcon,
  ChatBubbleIcon,
  CheckIcon,
  ClockIcon,
  WarningIcon,
  FileIcon,
  EnvelopeIcon,
} from '@/components/icons';

import StatCard from './components/StatCard';
import CaseCard from './components/CaseCard';
import ActivityTimeline from './components/ActivityTimeline';

import { Customer } from '../types';
import type { CaseSummary, Case, ActivityHistory } from './types';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [memo, setMemo] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoMessage, setMemoMessage] = useState<string | null>(null);
  const [messageCaseModalOpen, setMessageCaseModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const customerId = typeof params.id === 'string' ? params.id : null;

  const inProgressCases = cases.filter((c) => c.tag !== 'accepted' && c.subsidyId != null);

  useEffect(() => {
    if (!customerId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/expert/customers/${encodeURIComponent(customerId)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setCustomer(data.customer ?? null);
        setCaseSummary(data.caseSummary ?? null);
        setCases(data.cases ?? []);
        setActivityHistory(data.activityHistory ?? []);
        setMemo(data.memo ?? '');
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <ExpertSidebar activeItem="customers" />
        <main className="flex flex-col items-center justify-center flex-grow min-w-0 px-4 sm:px-6 py-4 sm:py-6 lg:ml-[255px]">
          <div className="text-[#4A5565]">読み込み中...</div>
        </main>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <ExpertSidebar activeItem="customers" />
        <main className="flex flex-col items-center justify-center flex-grow min-w-0 px-4 sm:px-6 py-4 sm:py-6 lg:ml-[255px]">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-[#101828] mb-4">顧客が見つかりません</h1>
            <button
              onClick={() => router.push('/expert/customers')}
              className="px-4 py-2 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors text-white"
            >
              顧客一覧に戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleMessageClick = () => {
    if (inProgressCases.length === 0) {
      setNotice('この顧客の進行中案件がありません。新規案件を作成するとメッセージを送れます。');
      setTimeout(() => setNotice(null), 5000);
      return;
    }
    if (inProgressCases.length === 1) {
      const c = inProgressCases[0];
      router.push(`/expert/management/${c.subsidyId}/${c.id}`);
      return;
    }
    setMessageCaseModalOpen(true);
  };

  const handleNewCaseClick = () => {
    if (!customerId) return;
    router.push(`/expert/search?customerId=${encodeURIComponent(customerId)}`);
  };

  const handleSaveMemo = async () => {
    if (!customerId) return;
    setMemoMessage(null);
    setMemoSaving(true);
    try {
      const res = await fetch(`/api/expert/customers/${encodeURIComponent(customerId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMemoMessage(data.error ?? '保存に失敗しました');
        return;
      }
      setMemoMessage('メモを保存しました');
      setTimeout(() => setMemoMessage(null), 3000);
    } catch {
      setMemoMessage('保存に失敗しました');
    } finally {
      setMemoSaving(false);
    }
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="customers" />

      {/* Main Content */}
      <main className="flex flex-col items-start flex-grow min-w-0 px-4 sm:px-6 py-4 sm:py-6 lg:ml-[255px]">
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-[1240px] mx-auto">
          {/* Header Card */}
          <div className="flex flex-col gap-4 bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="flex flex-row items-center px-3 gap-2 h-9 rounded-[10px] hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftIcon size={18} color="#364153" />
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">戻る</span>
                  </button>
                </div>
                {/* 모바일: 프로필 사진 옆에 이름·정보 나란히 / sm~: 동일 row */}
                <div className="flex flex-row gap-3 sm:gap-4 items-start">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#F3E8FF] rounded-full flex-shrink-0">
                    <span className="text-lg sm:text-xl font-normal leading-7 tracking-[-0.439453px] text-[#9810FA]">{customer.nameInitial}</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:gap-3 min-w-0 flex-1">
                    <h1 className="text-lg sm:text-2xl font-normal leading-7 sm:leading-8 tracking-[-0.3125px] text-[#101828] truncate">{customer.name}</h1>
                    {/* 모바일: 메일 한 줄 → 전화|주소, 업종|회사 나란히 / sm~: 기존 2열 (메일·전화·업종·所在地·회사) */}
                    <div className="grid grid-cols-2 gap-x-1.5 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 px-0 sm:px-1 text-xs sm:text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">
                      <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                        <EnvelopeIcon size={16} color="#99A1AF" className="flex-shrink-0" />
                        <span className="truncate">{customer.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 order-2 sm:order-none">
                        <PhoneCallIcon size={16} color="#99A1AF" className="flex-shrink-0" />
                        <span className="truncate">{customer.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 order-3 sm:order-none">
                        <LocationIcon size={16} color="#99A1AF" className="flex-shrink-0" />
                        <span className="truncate">{customer.location || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 order-4 sm:order-none">
                        <BuildingIcon size={16} color="#99A1AF" className="flex-shrink-0" />
                        <span className="truncate">{customer.industry || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 order-5 sm:order-none">
                        <FileIcon size={16} color="#99A1AF" className="flex-shrink-0" />
                        <span className="truncate">{customer.company || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs sm:text-sm text-[#6A7282] leading-5 tracking-[-0.150391px] flex-shrink-0">
                {caseSummary && caseSummary.inProgress > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F3E8FF] text-[#9810FA] rounded-full text-xs font-normal whitespace-nowrap">
                    進行中 {caseSummary.inProgress}件
                  </span>
                )}
                {(() => {
                  const latestUpdatedAt = cases
                    .map((c) => c.updatedAt)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
                  if (!latestUpdatedAt) return null;
                  const d = new Date(latestUpdatedAt);
                  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                  return (
                    <span className="text-xs text-[#6A7282] whitespace-nowrap">
                      最終更新: {dateStr}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Stats Cards - 모바일: 2x2(4등분), sm~: 2열, lg~: 4열 */}
          {caseSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <StatCard icon={<DocumentIcon size={20} color="#99A1AF" />} label="総案件数" value={caseSummary.total} />
              <StatCard icon={<ClockIcon size={20} color="#51A2FF" />} label="進行中" value={caseSummary.inProgress} valueColor="#155DFC" />
              <StatCard icon={<CheckIcon size={20} color="#05DF72" />} label="完了" value={caseSummary.completed} valueColor="#00A63E" />
              <StatCard icon={<WarningIcon size={20} color="#FDC700" />} label="審査中" value={caseSummary.underReview} valueColor="#D08700" />
            </div>
          )}

          {notice && (
            <p className="text-sm text-[#155DFC] bg-[#EFF6FF] border border-[#DBEAFE] rounded-[10px] px-4 py-3 w-full">
              {notice}
            </p>
          )}
          {/* Action Buttons - 모바일: 세로 1열 풀폭, sm~: 2열 */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={handleMessageClick}
              className="flex flex-row justify-center items-center gap-2 sm:h-[50px] h-[30px] w-full rounded-[14px] bg-gradient-to-r from-[#9810FA] to-[#2B7FFF] text-white hover:opacity-90 transition-colors"
            >
              <ChatBubbleIcon size={20} color="#FFFFFF" />
              <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px]">メッセージを送る</span>
            </button>
            <button
              type="button"
              onClick={handleNewCaseClick}
              className="flex flex-row justify-center items-center gap-2 sm:h-[50px] h-[30px] w-full bg-white border border-[#D1D5DC] rounded-[10px] text-[#364153] hover:bg-gray-50 transition-colors"
            >
              <DocumentIcon size={20} color="#364153" />
              <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px]">新規案件を作成</span>
            </button>
          </div>

          {/* 案件選択モーダル（メッセージを送る・進行中が複数あるとき） */}
          {messageCaseModalOpen && inProgressCases.length > 1 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setMessageCaseModalOpen(false)}>
              <div className="bg-white rounded-[14px] shadow-lg max-w-md w-full p-6 gap-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-normal text-[#101828]">メッセージを送る案件を選択</h3>
                <ul className="flex flex-col gap-2">
                  {inProgressCases.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 rounded-[10px] border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#101828] text-sm sm:text-base"
                        onClick={() => {
                          router.push(`/expert/management/${c.subsidyId}/${c.id}`);
                          setMessageCaseModalOpen(false);
                        }}
                      >
                        {c.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="self-end px-4 py-2 text-sm text-[#6A7282] hover:text-[#101828]"
                  onClick={() => setMessageCaseModalOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
          
          {/* Cases List */}
          <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">案件一覧</h2>
            </div>
            <div className="flex flex-col">
              {cases.length === 0 ? (
                <div className="px-4 sm:px-6 py-6 text-sm text-[#4A5565]">該当する案件がありません。</div>
              ) : (
                cases.map((caseData) => (
                  <CaseCard key={caseData.id} caseData={caseData} />
                ))
              )}
            </div>
          </div>

                    {/* Memo Section */}
          <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">メモ</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="顧客に関するメモを入力..."
                className="w-full h-[170px] px-4 py-3 text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent resize-none"
              />
              {memoMessage && (
                <p className={`text-sm ${memoMessage.startsWith('メモ') ? 'text-[#00A63E]' : 'text-[#C10007]'}`}>
                  {memoMessage}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveMemo}
                  disabled={memoSaving}
                  className="px-4 py-2 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {memoSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">活動履歴</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              {activityHistory.length === 0 ? (
                <div className="text-sm text-[#4A5565]">活動履歴がありません。</div>
              ) : (
                <ActivityTimeline activities={activityHistory} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
