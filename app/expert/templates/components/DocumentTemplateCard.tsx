import { documentCategoryBadges } from '../data';
import type { DocumentTemplate } from '../types';
import { DocumentIcon, LinkIcon, DownloadIcon, EditIconAlt, DeleteIconAlt, ShareIcon } from '@/components/icons';

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  onDownload?: (template: DocumentTemplate) => void;
  onOpenLink?: (template: DocumentTemplate) => void;
  onEdit?: (template: DocumentTemplate) => void;
  onDelete?: (template: DocumentTemplate) => void;
}

export default function DocumentTemplateCard({
  template,
  onDownload,
  onOpenLink,
  onEdit,
  onDelete,
}: DocumentTemplateCardProps) {
  const badge = documentCategoryBadges[template.category] || documentCategoryBadges['subsidy-application'];

  const handleAction = () => {
    if (template.actionType === 'download') {
      if (onDownload) {
        onDownload(template);
      } else {
        // Default download action
        console.log('Download:', template.title);
      }
    } else if (template.actionType === 'link') {
      if (onOpenLink) {
        onOpenLink(template);
      } else if (template.actionUrl) {
        window.open(template.actionUrl, '_blank');
      }
    }
  };

  const actionButtonBg = template.actionType === 'download' ? '#FAF5FF' : '#FFF7ED';
  const actionButtonBorder = template.actionType === 'download' ? '#E9D4FF' : '#FFD6A7';
  const actionButtonText = template.actionType === 'download' ? '#8200DB' : '#CA3500';
  const actionButtonIcon = template.actionType === 'download' ? DownloadIcon : ShareIcon;
  const ActionIcon = actionButtonIcon;

  return (
    <div className="group flex flex-col bg-white border border-[#E5E7EB] rounded-[10px] pt-4 sm:pt-[21px] px-4 sm:px-[21px] pb-4 sm:pb-[21px] gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5">
            {template.iconType === 'document' ? (
              <DocumentIcon size={20} color="#9810FA" />
            ) : (
              <LinkIcon size={20} color="#F54900" />
            )}
          </div>
          <div
            className="px-2 sm:px-2.5 py-1 rounded border text-xs leading-4 flex-shrink-0"
            style={{
              backgroundColor: badge.bgColor,
              borderColor: badge.borderColor,
              color: badge.textColor,
            }}
          >
            {badge.label}
          </div>
        </div>
        <div className="flex flex-row items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit?.(template)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="編集"
          >
            <EditIconAlt size={16} color="#6A7282" />
          </button>
          <button
            onClick={() => onDelete?.(template)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="削除"
          >
            <DeleteIconAlt size={16} color="#FB2C36" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#101828] break-words">
        {template.title}
      </h3>

      {/* Description */}
      <p className="text-xs sm:text-sm font-normal leading-4 sm:leading-5 tracking-[-0.150391px] text-[#4A5565] line-clamp-2">
        {template.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-row justify-between items-center text-xs leading-4 text-[#6A7282]">
        <span>更新: {template.updatedDate}</span>
        <span>使用: {template.usageCount}回</span>
      </div>

      {/* Action Button */}
      <button
        onClick={handleAction}
        className="flex flex-row justify-center items-center gap-2 h-[38px] sm:h-[42px] rounded-[10px] hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: actionButtonBg,
          border: `1px solid ${actionButtonBorder}`,
          color: actionButtonText,
        }}
      >
        <ActionIcon size={16} color={actionButtonText} />
        <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px]">
          {template.actionType === 'download' ? 'ダウンロード' : 'リンクを開く'}
        </span>
      </button>
    </div>
  );
}
