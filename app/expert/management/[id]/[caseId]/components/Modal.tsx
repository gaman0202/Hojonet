'use client';

import { useEffect, useCallback, useRef } from 'react';
import { XIcon } from '@/components/icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-[672px]',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // 배경 클릭으로 닫기
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

  // 모달 열릴 때 포커스
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
        <div className="flex flex-row justify-between items-start gap-3 px-4 lg:px-6 pt-4 lg:pt-6 pb-3 lg:pb-4 w-full border-b border-[#E5E7EB] flex-shrink-0">
          <div className="flex flex-row items-center gap-2 lg:gap-3 flex-1 min-w-0">
            {icon}
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <h2
                id="modal-title"
                className="text-lg lg:text-2xl font-normal leading-6 lg:leading-8 tracking-[0.0703125px] text-[#101828]"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-[10px] hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
            aria-label="閉じる"
          >
            <XIcon size={20} color="#0A0A0A" className="lg:w-6 lg:h-6" />
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
