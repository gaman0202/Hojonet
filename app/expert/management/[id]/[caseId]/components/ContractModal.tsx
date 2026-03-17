'use client';

import { useState } from 'react';
import { XIcon, PaperclipIcon, DocumentIcon } from '@/components/icons';

const FILE_INPUT_ID = 'contract-modal-file-input';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess?: () => void;
}

export default function ContractModal({ isOpen, onClose, caseId, onSuccess }: ContractModalProps) {
  const [description, setDescription] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [scope, setScope] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expert/cases/${caseId}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          scope: scope.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '送信に失敗しました');

      const contractTaskId = data.contractTaskId as number | undefined;
      if (contractTaskId != null && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch(`/api/tasks/${contractTaskId}/upload`, {
            method: 'POST',
            body: formData,
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || `${file.name} のアップロードに失敗しました`);
          }
        }
      }

      onSuccess?.();
      onClose();
      setDescription('');
      setPaymentTerms('');
      setScope('');
      setAttachedFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAttachedFiles([]);
    onClose();
  };

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = ''; // 同じファイルを再度選択できるように
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Container - Figma: 672px × 499px（クリックがバックドロップに伝わらないよう stopPropagation） */}
      <div className="relative flex flex-col items-start w-[calc(100%-32px)] max-w-[672px] bg-white rounded-[10px] shadow-xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header - Figma: padding 24px 24px 1px, height 85px, border-bottom */}
        <div className="flex flex-col items-start px-6 pt-6 pb-[1px] w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row justify-between items-center w-full">
            {/* Title - Figma: font-size 24px */}
            <h2 className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#101828]">
              契約進行確認
            </h2>
            {/* Close Button - Figma: 36px × 36px */}
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-9 h-9 p-2 rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
            >
              <XIcon size={20} color="#6A7282" />
            </button>
          </div>
        </div>

        {/* Content - Figma: padding 24px 24px 0px, gap 16px */}
        <div className="flex flex-col items-start px-6 pt-6 pb-6 gap-4 w-full">
          {/* Description Field */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              説明
            </label>
            <textarea
              placeholder="詳細説明を入力..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.5)] border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
            />
          </div>

          {/* ファイル添付：<label> で input と紐付け、ネイティブにファイル選択 */}
          <div className="flex flex-col items-start gap-2 w-full">
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              ファイル添付
            </span>
            <input
              id={FILE_INPUT_ID}
              type="file"
              multiple
              className="sr-only"
              onChange={addFiles}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
              aria-label="ファイルを選択"
            />
            <label
              htmlFor={FILE_INPUT_ID}
              className="w-full flex flex-row items-center justify-center gap-2 px-4 py-3 bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DC] rounded-[10px] hover:bg-[#EDEDED] hover:border-[#9810FA] transition-colors cursor-pointer"
            >
              <PaperclipIcon size={20} color="#4A5565" />
              <span className="text-sm font-normal leading-5 text-[#4A5565]">
                {attachedFiles.length > 0
                  ? `選択済み: ${attachedFiles.length}件（クリックで追加）`
                  : 'クリックしてファイルを選択'}
              </span>
            </label>

            {/* 添付されたファイル：常に表示し、中身の有無で切り替え */}
            <div className="w-full rounded-[10px] border border-[#E5E7EB] bg-[#FAFAFA] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#E5E7EB] bg-[#F3F4F6]">
                <span className="text-sm font-medium text-[#364153]">
                  添付されたファイル（{attachedFiles.length}件）
                </span>
              </div>
              <div className="max-h-[140px] overflow-y-auto p-2">
                {attachedFiles.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] py-4 text-center">まだファイルが選択されていません</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {attachedFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 px-3 py-2 bg-white rounded-[8px] border border-[#E5E7EB] shadow-sm">
                        <DocumentIcon size={18} color="#155DFC" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#101828] block truncate">{f.name}</span>
                          <span className="text-xs text-[#6A7282]">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="flex-shrink-0 px-2 py-1 text-xs text-[#6A7282] hover:text-[#C10007] hover:bg-[#FEE2E2] rounded transition-colors"
                          aria-label="削除"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 報酬・業務範囲 */}
          <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
            {/* Input Fields */}
            <div className="flex flex-col items-start gap-4 flex-1 w-full">
              <input
                type="text"
                placeholder="報酬および支払条件"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2.5 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.5)] border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
              />
              <input
                type="text"
                placeholder="業務範囲"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-4 py-2.5 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.5)] border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
              />
            </div>
          </div>

          {/* Template Button - Figma: border 2px solid #DAB2FF, height 44px */}
          <button className="flex flex-row justify-center items-center gap-2 w-full h-11 border-2 border-[#DAB2FF] rounded-[10px] hover:bg-[#FAF5FF] transition-colors">
            <DocumentIcon size={16} color="#9810FA" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#9810FA] text-center">
              テンプレートから選択
            </span>
          </button>

          {error && (
            <p className="text-sm text-red-600 w-full">{error}</p>
          )}
          {/* Action Buttons - Figma: gap 12px */}
          <div className="flex flex-col lg:flex-row items-start gap-3 w-full pt-2">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex items-center justify-center w-full lg:flex-1 h-[46px] border border-[#D1D5DC] rounded-[10px] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
            >
              <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] text-center">
                キャンセル
              </span>
            </button>
            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center w-full lg:flex-1 h-[46px] bg-[#9810FA] rounded-[10px] hover:bg-[#7A0DC8] transition-colors disabled:opacity-50"
            >
              <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white text-center">
                {submitting ? '送信中...' : '送信'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
