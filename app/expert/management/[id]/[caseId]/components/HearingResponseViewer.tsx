'use client';

import { useState } from 'react';
import { CheckCircleIcon, ClockIcon, DocumentIcon, XIcon } from '@/components/icons';

interface HearingQuestion {
  id: string;
  question: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface HearingResponse {
  id: string;
  templateTitle: string;
  customerName: string;
  status: 'pending' | 'submitted' | 'reviewed';
  questions: HearingQuestion[];
  responses: Record<string, string | string[]>;
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

interface HearingResponseViewerProps {
  isOpen: boolean;
  onClose: () => void;
  response: HearingResponse | null;
  onMarkReviewed: (responseId: string, comment: string) => void | Promise<void>;
}

export default function HearingResponseViewer({
  isOpen,
  onClose,
  response,
  onMarkReviewed,
}: HearingResponseViewerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen || !response) return null;

  const handleMarkReviewed = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onMarkReviewed(response.id, ''); // 코멘트 없이 확인 완료만
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '確認済みの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E', label: '未回答' };
      case 'submitted':
        return { bg: '#DBEAFE', text: '#1E40AF', label: '回答済み' };
      case 'reviewed':
        return { bg: '#DCFCE7', text: '#166534', label: '確認済み' };
      default:
        return { bg: '#F3F4F6', text: '#374151', label: status };
    }
  };

  const statusBadge = getStatusBadge(response.status);

  const renderAnswer = (question: HearingQuestion) => {
    const answer = response.responses[question.id];

    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      return <span className="text-[#9CA3AF] italic">未回答</span>;
    }

    if (Array.isArray(answer)) {
      return (
        <div className="flex flex-wrap gap-2">
          {answer.map((item, idx) => (
            <span key={idx} className="px-2 py-1 bg-[#F3E8FF] text-[#7C3AED] text-sm rounded">
              {item}
            </span>
          ))}
        </div>
      );
    }

    return <span className="text-[#101828]">{answer}</span>;
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-[700px] max-h-[90vh] bg-white rounded-2xl shadow-xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-row justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F3E8FF] rounded-lg flex items-center justify-center">
              <DocumentIcon size={20} color="#9810FA" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#101828]">{response.templateTitle}</h2>
              <p className="text-sm text-[#6A7282]">{response.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} color="#4A5565" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex flex-row items-center justify-between px-6 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
          >
            {statusBadge.label}
          </span>
          {response.submittedAt && (
            <span className="text-sm text-[#6A7282] flex items-center gap-1">
              <ClockIcon size={14} color="#6A7282" />
              提出日時: {new Date(response.submittedAt).toLocaleString('ja-JP')}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {response.questions.map((question, index) => (
              <div key={question.id} className="flex flex-col gap-2 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-[#9810FA] flex-shrink-0">Q{index + 1}</span>
                  <span className="text-sm font-medium text-[#364153]">
                    {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </div>
                <div className="ml-6 text-sm">
                  {renderAnswer(question)}
                </div>
              </div>
            ))}
          </div>

          {/* Already Reviewed */}
          {response.status === 'reviewed' && response.reviewedAt && (
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-[#166534]">
                <CheckCircleIcon size={18} color="#166534" />
                <span className="text-sm font-medium">確認済み</span>
                <span className="text-xs text-[#6A7282]">
                  ({new Date(response.reviewedAt).toLocaleString('ja-JP')})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 px-6 py-4 border-t border-[#E5E7EB]">
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
          <div className="flex flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 h-10 border border-[#D1D5DC] rounded-lg text-[#364153] hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
          {response.status === 'submitted' && (
            <button
              onClick={handleMarkReviewed}
              disabled={isSubmitting}
              className="px-6 py-2 h-10 bg-[#00A63E] rounded-lg text-white hover:bg-[#008236] transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <CheckCircleIcon size={16} color="#FFFFFF" />
                {isSubmitting ? '処理中...' : '確認完了'}
              </span>
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
