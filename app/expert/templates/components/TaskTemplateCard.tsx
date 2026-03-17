import { TaskTemplate } from '../types';
import { taskCategoryBadges, priorityBadges, roleLabels } from '../data';
import { CheckboxIcon, EditIconAlt, DeleteIconAlt } from '@/components/icons';

interface TaskTemplateCardProps {
  template: TaskTemplate;
  onEdit?: (template: TaskTemplate) => void;
  onDelete?: (template: TaskTemplate) => void;
}

export default function TaskTemplateCard({ template, onEdit, onDelete }: TaskTemplateCardProps) {
  const categoryBadge = taskCategoryBadges[template.category] || taskCategoryBadges.document;
  const priorityBadge = priorityBadges[template.priority];
  const roleLabel = roleLabels[template.role] || '';

  return (
    <div className="group relative box-border flex flex-col bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-[21px] gap-3 sm:gap-4 hover:shadow-md transition-shadow">
      {/* Header with Checkbox, Tags, and Action Buttons */}
      <div className="flex flex-row justify-between items-start gap-2">
        <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
          {/* Checkbox Icon */}
          <div className="flex-shrink-0 w-5 h-5">
            <CheckboxIcon size={20} color="#9810FA" />
          </div>
          
          {/* Category and Priority Tags */}
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <div
              className="px-2 sm:px-2.5 py-1 rounded border text-xs leading-4 flex-shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: categoryBadge.bgColor,
                borderColor: categoryBadge.borderColor,
                color: categoryBadge.textColor,
              }}
            >
              {categoryBadge.label}
            </div>
            <div
              className="px-2 sm:px-2.5 py-1 rounded border text-xs leading-4 flex-shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: priorityBadge.bgColor,
                borderColor: priorityBadge.borderColor,
                color: priorityBadge.textColor,
              }}
            >
              {priorityBadge.label}
            </div>
          </div>
        </div>

        {/* Edit/Delete Buttons (hidden on mobile, shown on hover) */}
        <div className="flex flex-row items-center gap-1 opacity-0 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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

      {/* Role Badge */}
      <div className="px-2 py-1 bg-[#F3F4F6] rounded text-xs leading-4 text-[#4A5565] w-fit">
        {roleLabel}
      </div>
    </div>
  );
}
