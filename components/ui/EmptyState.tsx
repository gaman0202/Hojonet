import { PlusIcon } from '@/components/icons';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ message, actionLabel, onAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 gap-4 w-full min-h-[148px] bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DC] rounded-[14px] ${className}`}>
      <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#6A7282]">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex flex-row items-center justify-center px-6 gap-2 h-12 bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors"
        >
          <PlusIcon size={20} color="#FFFFFF" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
