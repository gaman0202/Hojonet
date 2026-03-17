'use client';

import { useEffect, useCallback, useRef } from 'react';
import { XIcon } from '@/components/icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-[480px]',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`flex flex-col items-start w-full ${maxWidth} max-h-[90vh] bg-white rounded-[14px] overflow-hidden outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-row justify-between items-start px-6 pt-6 pb-4 w-full border-b border-[#E5E7EB] flex-shrink-0">
          <div className="flex flex-col items-start gap-1">
            <h2
              id="modal-title"
              className="text-xl font-medium leading-7 tracking-[-0.449219px] text-[#101828]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F3F4F6] transition-colors"
            aria-label="閉じる"
          >
            <XIcon size={20} color="#6A7282" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 w-full overflow-y-auto">{children}</div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex-shrink-0 w-full border-t border-[#E5E7EB]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
