'use client';

import { HearingTemplate } from '../types';
import { DocumentIcon, EditIconAlt, TrashIcon, CopyIconAlt } from '@/components/icons';

interface HearingTemplateCardProps {
  template: HearingTemplate;
  onEdit?: (template: HearingTemplate) => void;
  onDelete?: (template: HearingTemplate) => void;
  onDuplicate?: (template: HearingTemplate) => void;
}

export default function HearingTemplateCard({ template, onEdit, onDelete, onDuplicate }: HearingTemplateCardProps) {
  return (
    <div className="flex flex-col items-start p-4 gap-3 w-full bg-white border border-[#E5E7EB] rounded-[14px] hover:shadow-md transition-shadow h-full">
      {/* Header */}
      <div className="flex flex-row justify-between items-start w-full gap-2">
        <div className="flex flex-row items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 bg-[#F3E8FF] rounded-[10px]">
            <DocumentIcon size={20} color="#9810FA" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-medium text-[#101828] leading-6 line-clamp-1">{template.title}</h3>
            {template.subsidyType && (
              <span className="text-xs text-[#6A7282]">{template.subsidyType}</span>
            )}
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            template.isActive
              ? 'bg-[#DCFCE7] text-[#008236]'
              : 'bg-[#F3F4F6] text-[#6A7282]'
          }`}
        >
          {template.isActive ? '有効' : '無効'}
        </span>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-[#4A5565] leading-5 line-clamp-2">{template.description}</p>
      )}

      {/* Question Count */}
      <div className="flex flex-row items-center gap-2 text-sm text-[#6A7282]">
        <span>質問数: {template.questions.length}件</span>
        <span>・</span>
        <span>必須: {template.questions.filter((q) => q.required).length}件</span>
      </div>

      {/* Actions */}
      <div className="flex flex-row items-center gap-2 w-full pt-2 border-t border-[#E5E7EB] mt-auto">
        <button
          onClick={() => onEdit?.(template)}
          className="flex flex-row items-center gap-1.5 px-3 py-1.5 text-sm text-[#9810FA] hover:bg-[#F3E8FF] rounded-lg transition-colors"
        >
          <EditIconAlt size={14} color="#9810FA" />
          編集
        </button>
        <button
          onClick={() => onDuplicate?.(template)}
          className="flex flex-row items-center gap-1.5 px-3 py-1.5 text-sm text-[#4A5565] hover:bg-[#F3F4F6] rounded-lg transition-colors"
        >
          <CopyIconAlt size={14} color="#4A5565" />
          複製
        </button>
        <button
          onClick={() => onDelete?.(template)}
          className="flex flex-row items-center gap-1.5 px-3 py-1.5 text-sm text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors ml-auto"
        >
          <TrashIcon size={14} color="#DC2626" />
          削除
        </button>
      </div>
    </div>
  );
}
