import { categoryBadges } from '../data';
import { CopyIconAlt, ChatBubbleIcon, EditIconAlt, DeleteIconAlt } from '@/components/icons';
import { Template } from '../types';

interface TemplateCardProps {
  template: Template;
  onCopy?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

export default function TemplateCard({ template, onCopy, onEdit, onDelete }: TemplateCardProps) {
  const badge = categoryBadges[template.category] || categoryBadges.general;

  const handleCopy = () => {
    if (onCopy) {
      onCopy(template);
    } else {
      navigator.clipboard.writeText(template.content);
    }
  };

  return (
    <div className="group flex flex-col bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-[21px] gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5">
            <ChatBubbleIcon size={20} color="#155DFC" />
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

      {/* Content */}
      <p className="text-xs sm:text-sm font-normal leading-4 sm:leading-5 tracking-[-0.150391px] text-[#4A5565] line-clamp-3">
        {template.content}
      </p>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="flex flex-row justify-center items-center gap-2 h-[38px] sm:h-[42px] bg-[#EFF6FF] border border-[#BEDBFF] rounded-[10px] hover:bg-[#DBEAFE] transition-colors"
      >
        <CopyIconAlt size={16} color="#1447E6" />
        <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 tracking-[-0.3125px] text-[#1447E6]">
          コピー
        </span>
      </button>
    </div>
  );
}
