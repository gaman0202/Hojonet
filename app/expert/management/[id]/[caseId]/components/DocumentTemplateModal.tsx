'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { DocumentIcon } from '@/components/icons';

export interface DocumentTemplateItem {
  id: string;
  title: string;
  description?: string;
}

interface DocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTemplates: DocumentTemplateItem[];
  onSubmit: (template: DocumentTemplateItem) => Promise<void>;
}

export default function DocumentTemplateModal({
  isOpen,
  onClose,
  documentTemplates,
  onSubmit,
}: DocumentTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) setSelectedId(null);
  }, [isOpen]);

  const handleAdd = async () => {
    if (!selectedId) return;
    const template = documentTemplates.find((t) => t.id === selectedId);
    if (!template) return;
    setIsSubmitting(true);
    try {
      await onSubmit(template);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="テンプレートから追加"
      subtitle="書類テンプレートを選んでリストに追加"
      icon={<DocumentIcon size={20} color="#9810FA" className="lg:w-6 lg:h-6 flex-shrink-0" />}
      maxWidth="max-w-[672px]"
      footer={
        <div className="flex flex-col lg:flex-row justify-end items-center gap-3 px-4 lg:px-6 py-4 lg:py-6 bg-[#F9FAFB]">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex items-center justify-center px-4 py-2.5 w-full lg:w-auto border border-[#D1D5DC] rounded-[10px] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
          >
            <span className="text-sm lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153]">
              キャンセル
            </span>
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedId || isSubmitting}
            className="flex items-center justify-center px-4 py-2.5 w-full lg:w-auto bg-[#9810FA] rounded-[10px] hover:bg-[#7D0DD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm lg:text-base font-normal leading-6 tracking-[-0.3125px] text-white">
              {isSubmitting ? '追加中...' : 'この書類を追加'}
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 px-4 lg:px-6 py-4 max-h-[60vh] overflow-y-auto">
        {documentTemplates.length === 0 ? (
          <p className="text-sm text-[#6A7282] py-4">書類テンプレートがありません</p>
        ) : (
          documentTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId((prev) => (prev === t.id ? null : t.id))}
              className={`flex flex-row items-start gap-3 p-3 rounded-[10px] border text-left transition-colors ${
                selectedId === t.id
                  ? 'border-[#9810FA] bg-[#FAF5FF]'
                  : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
              }`}
            >
              <DocumentIcon size={20} color={selectedId === t.id ? '#9810FA' : '#6A7282'} className="flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-medium leading-5 text-[#101828]">{t.title || '(無題)'}</span>
                {t.description ? (
                  <span className="text-xs font-normal leading-4 text-[#6A7282] line-clamp-2">{t.description}</span>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
