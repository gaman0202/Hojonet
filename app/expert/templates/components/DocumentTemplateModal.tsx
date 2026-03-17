'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon, ChevronDownIcon, UploadIcon, DocumentIcon } from '@/components/icons';
import { documentFilterCategories } from '../data';
import type { DocumentTemplate } from '../types';
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';

interface DocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: string;
    type: 'file' | 'link';
    description: string;
    file?: File;
    linkUrl?: string;
  }, templateId?: string) => Promise<void> | void;
  initialTemplate?: DocumentTemplate | null;
}

export default function DocumentTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  initialTemplate,
}: DocumentTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('');
  const [templateType, setTemplateType] = useState<'file' | 'link'>('file');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setTemplateName(initialTemplate.title);
      setCategory(initialTemplate.category);
      setTemplateType(initialTemplate.actionType === 'link' ? 'link' : 'file');
      setDescription(initialTemplate.description);
      setLinkUrl(initialTemplate.actionUrl ?? '');
      setSelectedFile(null);
    } else if (isOpen) {
      setTemplateName('');
      setCategory('');
      setTemplateType('file');
      setDescription('');
      setSelectedFile(null);
      setLinkUrl('');
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

  // 파일 드래그 앤 드롭
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleClose = useCallback(() => {
    setTemplateName('');
    setCategory('');
    setTemplateType('file');
    setDescription('');
    setSelectedFile(null);
    setLinkUrl('');
    setIsCategoryOpen(false);
    setIsDragging(false);
    onClose();
  }, [onClose]);

  const handleFileSelect = (file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!templateName || !category || !description) {
      return;
    }

    if (templateType === 'file' && !selectedFile && !initialTemplate) {
      alert('ファイルを選択してください。');
      return;
    }

    if (templateType === 'link' && !linkUrl) {
      alert('外部リンクURLを入力してください。');
      return;
    }

    // selectedFile を先にキャプチャしてから onSubmit に渡す
    const fileToSubmit = selectedFile ?? undefined;
    await onSubmit(
      {
        name: templateName,
        category,
        type: templateType,
        description,
        file: fileToSubmit,
        linkUrl: templateType === 'link' ? linkUrl : undefined,
      },
      initialTemplate?.id
    );
    handleClose();
  };

  const selectedCategory = documentFilterCategories.find((cat) => cat.value === category);

  if (!isOpen) return null;

  const isFormValid =
    templateName && category && description && (templateType === 'link' ? linkUrl : selectedFile || initialTemplate);

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
          <div className="px-6 pt-6 pb-4 w-full">
            <h2 className="text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828] mb-4">
              {initialTemplate ? 'テンプレート編集' : '新規テンプレート登録'}
            </h2>
            <div
              className="px-3 py-1.5 bg-[#F3E8FF] border border-[#E9D4FF] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#8200DB] inline-block"
            >
              書類テンプレート
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-6 pt-6 pb-6 gap-4 w-full overflow-y-auto flex-1">
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
              className="w-full h-[42px] px-4 py-2 text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
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
                  className={`text-base font-normal leading-5 tracking-[-0.3125px] ${
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
                  {documentFilterCategories
                    .filter((cat) => cat.value !== 'all')
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value);
                          setIsCategoryOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {cat.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              タイプ
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <div className="flex flex-row items-center gap-4">
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <div className="relative w-4 h-4">
                  <input
                    type="radio"
                    name="templateType"
                    value="file"
                    checked={templateType === 'file'}
                    onChange={(e) => setTemplateType(e.target.value as 'file' | 'link')}
                    className="absolute opacity-0 w-4 h-4 cursor-pointer"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border border-[#D9D9D9] flex items-center justify-center ${
                      templateType === 'file' ? 'bg-[#1369FF] border-[#1369FF]' : 'bg-white'
                    }`}
                  >
                    {templateType === 'file' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  ファイル
                </span>
              </label>
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <div className="relative w-4 h-4">
                  <input
                    type="radio"
                    name="templateType"
                    value="link"
                    checked={templateType === 'link'}
                    onChange={(e) => setTemplateType(e.target.value as 'file' | 'link')}
                    className="absolute opacity-0 w-4 h-4 cursor-pointer"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border border-[#D9D9D9] flex items-center justify-center ${
                      templateType === 'link' ? 'bg-[#1369FF] border-[#1369FF]' : 'bg-white'
                    }`}
                  >
                    {templateType === 'link' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  外部リンク
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              説明
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このテンプレートの用途や内容を簡潔に説明してください"
              className="w-full h-[98px] px-4 py-3 text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
            />
          </div>

          {/* File Upload or Link URL */}
          {templateType === 'file' ? (
            <div className="flex flex-col items-start gap-2 w-full">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                ファイルアップロード
              </label>
              <div
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-[132px] border-2 border-dashed rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#9810FA] bg-[#FAF5FF]'
                    : 'border-[#D1D5DC] hover:border-[#9810FA] hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptAttribute()}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <UploadIcon size={32} color={selectedFile ?? initialTemplate?.fileName ? '#9810FA' : '#99A1AF'} className="mb-2" />
                <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] mb-1">
                  {selectedFile
                    ? selectedFile.name
                    : initialTemplate?.fileName
                      ? initialTemplate.fileName
                      : 'クリックしてファイルを選択'}
                </p>
                {(selectedFile ?? initialTemplate?.fileName) ? (
                  <p className="text-xs font-normal leading-4 text-[#9810FA]">
                    {selectedFile ? '新しいファイルが選択されています' : '添付済み・クリックで変更'}
                  </p>
                ) : (
                  <p className="text-xs font-normal leading-4 text-[#6A7282]">
                    PDF, Word, Excel, PowerPoint, 画像, ZIP (最大10MB)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 w-full">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                外部リンクURL
                <span className="text-[#FB2C36] ml-1">*</span>
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-[42px] px-4 py-2 text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-row justify-end items-center px-6 py-5 gap-3 w-full border-t border-[#E5E7EB] flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center px-6 py-3 h-[46px] bg-white border border-[#D1D5DC] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153] hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="flex flex-row items-center px-6 gap-2 h-[46px] bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <span>登録</span>
          </button>
        </div>
      </div>
    </div>
  );
}
