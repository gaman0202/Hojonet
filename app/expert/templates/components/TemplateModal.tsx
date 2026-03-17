'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon, ChevronDownIcon } from '@/components/icons';
import { TemplateType, Template } from '../types';
import { filterCategories } from '../data';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: TemplateType;
  onSubmit: (data: { name: string; category: string; content: string }, templateId?: string) => void;
  initialTemplate?: Template | null;
}

export default function TemplateModal({
  isOpen,
  onClose,
  templateType,
  onSubmit,
  initialTemplate,
}: TemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setTemplateName(initialTemplate.title);
      setCategory(initialTemplate.category);
      setMessageContent(initialTemplate.content);
    } else if (isOpen) {
      setTemplateName('');
      setCategory('');
      setMessageContent('');
    }
  }, [isOpen, initialTemplate]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCategoryOpen) {
          setIsCategoryOpen(false);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isCategoryOpen]);

  // 드롭다운 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };

    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen]);

  const handleClose = useCallback(() => {
    setTemplateName('');
    setCategory('');
    setMessageContent('');
    setIsCategoryOpen(false);
    onClose();
  }, [onClose]);

  const handleSubmit = () => {
    if (!templateName || !category || !messageContent) {
      return;
    }
    onSubmit({ name: templateName, category, content: messageContent }, initialTemplate?.id);
    handleClose();
  };

  const selectedCategory = filterCategories.find((cat) => cat.value === category);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col items-start w-full max-w-[768px] max-h-[90vh] bg-white rounded-[10px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-start w-full border-b border-[#E5E7EB] flex-shrink-0">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 w-full">
            <h2 className="text-lg sm:text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828] mb-3 sm:mb-4">
              {initialTemplate ? 'テンプレート編集' : '新規テンプレート登録'}
            </h2>
            <div className="px-3 py-1.5 bg-[#DBEAFE] border border-[#BEDBFF] rounded text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#1447E6] inline-block">
              メッセージテンプレート
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 gap-4 w-full overflow-y-auto flex-1">
          {/* Template Name */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              テンプレート名
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例: 初回ヒアリング依頼メッセージ"
              className="w-full h-[42px] px-4 py-2 text-sm sm:text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              カテゴリー
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <div className="relative w-full" ref={categoryRef}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full h-[39px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`text-sm sm:text-base font-normal leading-5 tracking-[-0.3125px] ${
                    selectedCategory ? 'text-[#101828]' : 'text-[rgba(10,10,10,0.5)]'
                  }`}
                >
                  {selectedCategory ? selectedCategory.label : 'カテゴリーを選択'}
                </span>
                <ChevronDownIcon
                  size={20}
                  color="#4A5565"
                  className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isCategoryOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                  {filterCategories
                    .filter((cat) => cat.value !== 'all')
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value);
                          setIsCategoryOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm sm:text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {cat.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              メッセージ内容
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="w-full h-[180px] sm:h-[218px] px-4 py-3 text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
              placeholder="メッセージ内容を入力..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-row justify-end items-center px-4 sm:px-6 py-4 sm:py-5 gap-3 w-full border-t border-[#E5E7EB] flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center px-4 sm:px-6 py-3 h-[42px] sm:h-[46px] bg-white border border-[#D1D5DC] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153] hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!templateName || !category || !messageContent}
            className="flex flex-row items-center px-4 sm:px-6 gap-2 h-[42px] sm:h-[46px] bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <span>{initialTemplate ? '更新' : '登録'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
