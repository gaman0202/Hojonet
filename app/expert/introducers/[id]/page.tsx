'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneCallIcon,
  WarningIcon,
  FileIcon,
  LocationIcon,
  BuildingIcon,
  ChatBubbleIcon,
} from '@/components/icons';

type Introducer = {
  id: string;
  name: string;
  nameInitial: string;
  email: string;
  phone: string;
  industry: string;
  companyName?: string;
  location: string;
};

type ReferredCustomer = {
  id: string;
  name: string;
  email: string;
  initial?: string;
  color?: string;
  bg?: string;
};

type CaseSummary = {
  total: number;
  inProgress: number;
  completed: number;
  underReview: number;
};

type CaseItem = {
  id: string;
  subsidyId: string | null;
  tag: string;
  title: string;
  deadline: string;
  progress: string;
  amount: string;
  referredCustomers: ReferredCustomer[];
};

export default function IntroducerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const introducerId = typeof params.id === 'string' ? params.id : null;

  const [introducer, setIntroducer] = useState<Introducer | null>(null);
  const [referredCustomers, setReferredCustomers] = useState<ReferredCustomer[]>([]);
  const [caseSummary, setCaseSummary] = useState<CaseSummary>({ total: 0, inProgress: 0, completed: 0, underReview: 0 });
  const [caseItems, setCaseItems] = useState<CaseItem[]>([]);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoMessage, setMemoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!introducerId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/expert/introducers/${encodeURIComponent(introducerId)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setIntroducer(null);
          return;
        }
        if (!res.ok) {
          setNotFound(true);
          setIntroducer(null);
          return;
        }
        const data = await res.json();
        setIntroducer(data.introducer ?? null);
        setReferredCustomers(data.referredCustomers ?? []);
        setCaseSummary(data.caseSummary ?? { total: 0, inProgress: 0, completed: 0, underReview: 0 });
        setCaseItems(data.caseItems ?? []);
        setMemo(data.memo ?? '');
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [introducerId]);

  const handleSaveMemo = async () => {
    if (!introducerId) return;
    setMemoMessage(null);
    setMemoSaving(true);
    try {
      const res = await fetch(`/api/expert/introducers/${encodeURIComponent(introducerId)}`, {
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

  if (loading) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <ExpertSidebar activeItem="introducers" />
        <main className="flex flex-col items-center justify-center flex-grow min-w-0 px-4 sm:px-6 py-4 sm:py-6 lg:ml-[255px]">
          <div className="text-[#4A5565]">読み込み中...</div>
        </main>
      </div>
    );
  }

  if (notFound || !introducer) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <ExpertSidebar activeItem="introducers" />
        <main className="flex flex-col items-center justify-center flex-grow min-w-0 px-4 sm:px-6 py-4 sm:py-6 lg:ml-[255px]">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-[#101828] mb-4">紹介者が見つかりません</h1>
            <button
              onClick={() => router.push('/expert/introducers')}
              className="px-4 py-2 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors text-white"
            >
              紹介者一覧に戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="introducers" />

      <main className="flex flex-col items-start flex-grow min-w-0 lg:ml-[255px]">
        <div className="flex flex-col items-start px-4 sm:px-6 py-4 sm:py-6 gap-4 sm:gap-6 w-full bg-white border-b border-[#E5E7EB]">
          <button
            onClick={() => router.back()}
            className="flex flex-row items-center px-4 gap-2 h-10 rounded-[10px] hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon size={20} color="#364153" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153]">戻る</span>
          </button>

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full">
            <div
              className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #AD46FF 0%, #2B7FFF 100%)' }}
            >
              <span className="text-2xl sm:text-3xl font-normal text-white">{introducer.nameInitial}</span>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 flex-grow w-full">
              <h1 className="text-2xl sm:text-[30px] font-normal leading-8 sm:leading-9 tracking-[0.395508px] text-[#101828]">
                {introducer.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-start w-full gap-3 sm:gap-8">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center gap-2">
                    <EnvelopeIcon size={16} color="#99A1AF" />
                    <span className="text-sm text-[#4A5565] break-all">{introducer.email}</span>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <FileIcon size={16} color="#99A1AF" />
                    <span className="text-sm text-[#4A5565]">{introducer.industry}</span>
                  </div>
                  {introducer.companyName && (
                    <div className="flex flex-row items-center gap-2">
                      <BuildingIcon size={16} color="#99A1AF" />
                      <span className="text-sm text-[#4A5565]">{introducer.companyName}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center gap-2">
                    <PhoneCallIcon size={16} color="#99A1AF" />
                    <span className="text-sm text-[#4A5565]">{introducer.phone}</span>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <LocationIcon size={16} color="#99A1AF" />
                    <span className="text-sm text-[#4A5565]">{introducer.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start px-4 sm:px-6 py-4 sm:py-6 gap-4 sm:gap-6 w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="flex flex-col items-start p-4 sm:p-[17px] gap-2 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex flex-row items-center gap-2">
                <DocumentIcon size={20} color="#99A1AF" />
                <span className="text-xs sm:text-sm font-normal leading-5 text-[#4A5565]">総案件数</span>
              </div>
              <span className="text-xl sm:text-2xl font-normal leading-7 sm:leading-8 text-[#101828]">{caseSummary.total}</span>
            </div>
            <div className="flex flex-col items-start p-4 sm:p-[17px] gap-2 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex flex-row items-center gap-2">
                <ClockIcon size={20} color="#51A2FF" />
                <span className="text-xs sm:text-sm font-normal leading-5 text-[#4A5565]">進行中</span>
              </div>
              <span className="text-xl sm:text-2xl font-normal leading-7 sm:leading-8 text-[#155DFC]">{caseSummary.inProgress}</span>
            </div>
            <div className="flex flex-col items-start p-4 sm:p-[17px] gap-2 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex flex-row items-center gap-2">
                <CheckIcon size={20} color="#05DF72" />
                <span className="text-xs sm:text-sm font-normal leading-5 text-[#4A5565]">完了</span>
              </div>
              <span className="text-xl sm:text-2xl font-normal leading-7 sm:leading-8 text-[#00A63E]">{caseSummary.completed}</span>
            </div>
            <div className="flex flex-col items-start p-4 sm:p-[17px] gap-2 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex flex-row items-center gap-2">
                <WarningIcon size={20} color="#FDC700" />
                <span className="text-xs sm:text-sm font-normal leading-5 text-[#4A5565]">審査中</span>
              </div>
              <span className="text-xl sm:text-2xl font-normal leading-7 sm:leading-8 text-[#D08700]">{caseSummary.underReview}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full">
            <button
              type="button"
              className="flex flex-row justify-center items-center gap-2 flex-1 h-[50px] rounded-[14px] hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #9810FA 0%, #2B7FFF 100%)' }}
              disabled
              title="準備中"
            >
              <ChatBubbleIcon size={20} color="#FFFFFF" />
              <span className="text-sm sm:text-base font-normal leading-6 text-white">メッセージを送る</span>
            </button>
            <Link
              href="/expert/search"
              className="flex flex-row justify-center items-center gap-2 flex-1 h-[50px] bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
            >
              <DocumentIcon size={20} color="#364153" />
              <span className="text-sm sm:text-base font-normal leading-6 text-[#364153]">新規案件を作成</span>
            </Link>
          </div>

          {caseItems.map((item) => (
            <div key={item.id} className="flex flex-col w-full gap-4 sm:gap-6">
              <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 gap-3">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex flex-row items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 bg-[#F3F4F6] rounded-full text-xs font-normal text-[#364153]">{item.tag}</span>
                      <Link href={item.subsidyId ? `/expert/management/${item.subsidyId}/${item.id}` : '/expert/management'} className="text-sm sm:text-base font-normal leading-6 text-[#101828] hover:underline break-words">
                        {item.title}
                      </Link>
                    </div>
                    <div className="flex flex-row items-center gap-3 sm:gap-4 text-xs sm:text-sm text-[#4A5565] flex-wrap">
                      <div className="flex flex-row items-center gap-1">
                        <CalendarIcon size={16} color="#4A5565" />
                        <span>締切: {item.deadline || '—'}</span>
                      </div>
                      <div className="flex flex-row items-center gap-1">
                        <DocumentIcon size={16} color="#4A5565" />
                        <span>{item.progress}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                    <span className="text-xs sm:text-sm text-[#6A7282]">支援金額</span>
                    <span className="text-lg sm:text-xl font-normal leading-7 text-[#155DFC]">{item.amount}</span>
                  </div>
                </div>
                {item.referredCustomers && item.referredCustomers.length > 0 && (
                  <div className="flex flex-col mx-4 sm:mx-6 mt-0 mb-4 sm:mb-6 bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                    <div className="pl-4 pr-6 sm:pl-6 sm:pr-8 pt-4 pb-2">
                      <h3 className="text-sm sm:text-base font-normal leading-4 text-[#101828]">紹介顧客リスト</h3>
                    </div>
                    <div className="pl-4 pr-6 sm:pl-6 pb-4 sm:pb-7 flex flex-col gap-3">
                      {item.referredCustomers.map((customer, index) => {
                        const colorSet = { color: customer.color ?? '#9810FA', bg: customer.bg ?? '#F3E8FF' };
                        return (
                          <Link
                            key={`${item.id}-${customer.id}-${index}`}
                            href={`/expert/customers/${customer.id}`}
                            className="flex flex-row justify-between items-center px-3 sm:px-4 py-3 sm:py-4 gap-3 w-full bg-[#F9FAFB] rounded-[10px] hover:bg-[#E5E7EB] transition-colors"
                          >
                            <div className="flex flex-row items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <div
                                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colorSet.bg }}
                              >
                                <span className="text-xs sm:text-sm font-normal" style={{ color: colorSet.color }}>
                                  {(customer.initial ?? customer.name).charAt(0)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <p className="text-sm font-normal leading-5 text-[#101828] truncate">{customer.name}</p>
                                <p className="text-xs font-normal leading-4 text-[#4A5565] truncate">{customer.email}</p>
                              </div>
                            </div>
                            <ChevronRightIcon size={14} color="#99A1AF" className="flex-shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-col w-full bg-white border border-[#E5E7EB] rounded-[10px]">
            <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-[#E5E7EB]">
              <h2 className="text-lg sm:text-xl font-normal leading-7 text-[#101828]">メモ</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="紹介者に関するメモを入力..."
                className="w-full h-[170px] px-4 py-3 text-sm sm:text-base font-normal leading-6 text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent resize-none"
              />
              {memoMessage && (
                <p className={`text-sm ${memoMessage.startsWith('メモ') ? 'text-[#00A63E]' : 'text-[#C10007]'}`}>{memoMessage}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveMemo}
                  disabled={memoSaving}
                  className="px-5 py-2 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="text-sm sm:text-base font-normal leading-6 text-white">
                    {memoSaving ? '保存中...' : '保存'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
