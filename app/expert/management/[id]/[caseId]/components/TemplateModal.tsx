'use client';

'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { DocumentIcon, UploadIcon } from '@/components/icons';
import { TaskTemplate } from '../types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTemplates: TaskTemplate[];
  onSubmit: (selectedTemplates: TaskTemplate[]) => Promise<void>;
}

export default function TemplateModal({
  isOpen,
  onClose,
  taskTemplates,
  onSubmit,
}: TemplateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) setSelectedIds(new Set());
  }, [isOpen]);

  const toggle = (id: string | number) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) {
      onClose();
      return;
    }
    const selected = taskTemplates.filter((t) => selectedIds.has(String(t.id)));
    setIsSubmitting(true);
    try {
      await onSubmit(selected);
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
      title="テンプレート選択"
      subtitle="よく使うタスクテンプレートから選択"
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
            onClick={handleApply}
            disabled={isSubmitting || selectedIds.size === 0}
            className="flex items-center justify-center px-4 py-2.5 w-full lg:w-auto bg-[#9810FA] rounded-[10px] hover:bg-[#7A0DC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm lg:text-base font-normal leading-6 tracking-[-0.3125px] text-white">
              {isSubmitting ? '適用中...' : '選択したテンプレートを適用'}
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 p-4 lg:p-6">
        {taskTemplates.map((template) => (
          <label
            key={template.id}
            className="flex flex-row items-start gap-3 p-3 lg:p-4 border border-[#E5E7EB] rounded-[10px] cursor-pointer hover:border-[#9810FA] hover:bg-[#FAF5FF] transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(String(template.id))}
              onChange={() => toggle(template.id)}
              className="w-4 h-4 border border-[#D1D5DC] rounded focus:ring-2 focus:ring-[#9810FA] flex-shrink-0 mt-0.5"
            />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex flex-row items-center gap-2 flex-wrap">
                <h3 className="text-sm lg:text-base font-normal leading-6 text-[#101828]">
                  {template.title}
                </h3>
                <span
                  className="px-2 py-0.5 rounded text-xs font-normal"
                  style={{
                    backgroundColor: template.priorityColor.bg,
                    color: template.priorityColor.text,
                  }}
                >
                  {template.priority}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-normal bg-[#F3F4F6] text-[#364153]">
                  {template.assignee}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-normal bg-[#F7EEFF] text-[#9810FA]">
                  {template.category}
                </span>
              </div>
              <p className="text-xs lg:text-sm leading-5 text-[#4A5565]">
                {template.description}
              </p>
              <p className="text-xs leading-4 text-[#6A7282]">
                担当: {template.assignee}
              </p>
              {template.fileName && (
                <div className="flex items-center gap-1 mt-1">
                  <UploadIcon size={12} color="#9810FA" />
                  <span className="text-xs text-[#9810FA]">{template.fileName}</span>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}
