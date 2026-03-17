'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import { ArrowLeftIcon, ClockIcon, ChatBubbleIcon, WarningIcon } from '@/components/icons';
import { useProfile } from '@/hooks/useProfile';
import { getEmptyKanbanColumns, type CaseCard, type KanbanColumn } from '@/lib/expert/cases';

// Components
import ContractModal from './[caseId]/components/ContractModal';

// Card Component
function CaseCardComponent({
  card,
  subsidyId,
  onContractClick,
  onRejectClick,
}: {
  card: CaseCard;
  subsidyId: string;
  onContractClick: (caseId: number) => void;
  onRejectClick: (caseId: number) => void;
}) {
  return (
    <Link
      href={`/expert/management/${subsidyId}/${card.id}`}
      className="flex flex-col items-start p-[17px] gap-3 w-full min-w-0 bg-white border border-[#E5E7EB] rounded-[10px] hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* User Info */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-row items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-[#F3E8FF] rounded-full">
            <span className="text-xs font-normal leading-4 text-[#9810FA]">{card.userInitial}</span>
          </div>
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            {card.userName}
          </span>
        </div>
        <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA]">
          {card.amount}
        </span>
      </div>

      {/* Deadline */}
      <div className="flex flex-row items-center gap-1.5 px-2 py-1 w-full bg-[#F9FAFB] rounded">
        <ClockIcon size={12} color="#4A5565" />
        <span className="text-xs font-normal leading-4 text-[#4A5565]">締切日: {card.deadline}</span>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex flex-row justify-between items-center">
          <span className="text-xs font-normal leading-4 text-[#6A7282]">進行率</span>
          <span className="text-xs font-medium leading-4 text-[#6A7282]">{card.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${card.progress}%`,
              backgroundColor: card.progressColor || '#99A1AF',
            }}
          />
        </div>
      </div>

      {/* Badges and Action Buttons */}
      <div className="flex flex-row items-center justify-between gap-2 w-full">
        <div className="flex flex-row items-center gap-2 flex-wrap">
          {card.urgentLevel && (
            <div className="flex flex-row items-center gap-1 px-2 py-1 bg-[#FEF2F2] rounded">
              <WarningIcon size={12} color="#C10007" />
              <span className="text-xs font-normal leading-4 text-[#C10007]">
                緊急 {card.urgentLevel}
              </span>
            </div>
          )}
          {card.chatCount && (
            <div className="flex flex-row items-center gap-1 px-2 py-1 bg-[#EFF6FF] rounded">
              <ChatBubbleIcon size={12} color="#1447E6" />
              <span className="text-xs font-normal leading-4 text-[#1447E6]">{card.chatCount}</span>
            </div>
          )}
          {card.needsAction && (
            <div className="flex flex-row items-center px-2 py-1 bg-[#FFF7ED] rounded">
              <span className="text-xs font-normal leading-4 text-[#CA3500]">措置必要</span>
            </div>
          )}
        </div>
        {card.hasButtons && (
          <div className="flex flex-row items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRejectClick(card.id);
              }}
              className="flex items-center justify-center px-2 lg:px-4 py-1.5 bg-[#FB2C36] rounded-[10px] hover:bg-[#E01E28] transition-colors whitespace-nowrap"
            >
              <span className="text-[10px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-white">
                却下
              </span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContractClick(card.id);
              }}
              className="flex items-center justify-center px-2 lg:px-4 py-1.5 bg-[#00C950] rounded-[10px] hover:bg-[#00B045] transition-colors whitespace-nowrap"
            >
              <span className="text-[10px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-white">
                契約進行
              </span>
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function CaseDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { profile, loading: profileLoading } = useProfile();
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractModalCaseId, setContractModalCaseId] = useState<string>('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subsidyTitle, setSubsidyTitle] = useState('');
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const subsidyId = parseInt(id, 10);
    if (Number.isNaN(subsidyId)) {
      setSubsidyTitle('');
      setKanbanColumns(getEmptyKanbanColumns());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/expert/management/kanban?subsidyId=${subsidyId}`);
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || '読み込みに失敗しました');
          setKanbanColumns(getEmptyKanbanColumns());
          return;
        }
        const result = await res.json();
        setSubsidyTitle(result.subsidyTitle ?? '');
        setKanbanColumns(result.kanbanColumns ?? getEmptyKanbanColumns());
        if (result.error) setError(result.error);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const totalCases = kanbanColumns.reduce((sum, col) => sum + col.count, 0);

  const refetchKanban = useCallback(() => {
    if (!id) return;
    const subsidyIdNum = parseInt(id, 10);
    if (Number.isNaN(subsidyIdNum)) return;
    fetch(`/api/expert/management/kanban?subsidyId=${subsidyIdNum}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result?.kanbanColumns) setKanbanColumns(result.kanbanColumns);
      })
      .catch(() => {});
  }, [id]);

  const handleReject = useCallback(
    async (caseId: number) => {
      if (!confirm('この案件を却下しますか？')) return;
      setRejectLoading(true);
      try {
        const res = await fetch(`/api/expert/cases/${caseId}/reject`, { method: 'PATCH' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || '却下に失敗しました');
          return;
        }
        refetchKanban();
      } finally {
        setRejectLoading(false);
      }
    },
    [refetchKanban]
  );

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="management" />

      <main className="flex flex-col items-start w-full min-w-0 h-screen lg:ml-[255px]">
        <div className="flex flex-col items-start p-4 lg:p-6 gap-4 w-full bg-white border-b border-[#E5E7EB] flex-shrink-0">
          <Link
            href="/expert/management"
            className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeftIcon size={20} color="#4A5565" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
              補助金リスト
            </span>
          </Link>
          <div className="flex flex-col gap-1 w-full">
            <h1 className="text-xl lg:text-2xl font-normal leading-7 lg:leading-8 tracking-[0.395508px] text-[#101828]">
              {loading ? '読み込み中...' : subsidyTitle || '（補助金を取得できませんでした）'}
            </h1>
            <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
              案件 {loading ? '—' : totalCases}件
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 w-full items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9810FA]" />
            <span className="ml-3 text-[#4A5565]">読み込み中...</span>
          </div>
        ) : error ? (
          <div className="flex flex-1 w-full items-center justify-center p-8 text-[#4A5565]">
            {error}
          </div>
        ) : (
          <div className="flex flex-row items-start gap-4 p-4 lg:p-6 overflow-x-auto w-full flex-1 min-h-0">
            {kanbanColumns.map((column) => (
              <div key={column.id} className="flex flex-col items-start gap-3 flex-shrink-0 w-[300px] lg:w-[320px] min-w-[300px]">
                <div className="flex flex-row justify-between items-center p-[13px] pb-3 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                  <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                    {column.title}
                  </h3>
                  <span className="flex items-center justify-center min-w-[22px] h-7 px-2 bg-[#F3F4F6] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    {column.count}
                  </span>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  {column.cards.map((card) => (
                    <CaseCardComponent
                      key={card.id}
                      card={card}
                      subsidyId={id}
                      onContractClick={(caseId) => {
                        setContractModalCaseId(String(caseId));
                        setIsContractModalOpen(true);
                      }}
                      onRejectClick={handleReject}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => { setIsContractModalOpen(false); setContractModalCaseId(''); }}
        caseId={contractModalCaseId}
      />
    </div>
  );
}
