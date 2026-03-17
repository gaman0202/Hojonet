'use client';

import { useState, useEffect, useRef } from 'react';
import { MailIcon, LinkIcon, CopyIconAlt, XIcon, PlusIcon, ShareIconAlt } from '@/components/icons';
import { ChevronDownIcon } from '@/components/icons';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'email' | 'link';
  onTabChange: (tab: 'email' | 'link') => void;
  email: string;
  onEmailChange: (email: string) => void;
  role: 'administrative-scrivener' | 'assistant';
  onRoleChange: (role: 'administrative-scrivener' | 'assistant') => void;
  message: string;
  onMessageChange: (message: string) => void;
  inviteLink: string;
  onAdd: () => void;
  onCopyLink: () => void;
  onShareLink: () => void;
}

const roleOptions = [
  { value: 'administrative-scrivener', label: '行政書士' },
  { value: 'assistant', label: 'アシスタント' },
];

export default function AddMemberModal({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  email,
  onEmailChange,
  role,
  onRoleChange,
  message,
  onMessageChange,
  inviteLink,
  onAdd,
  onCopyLink,
  onShareLink,
}: AddMemberModalProps) {
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRoleOpen) {
          setIsRoleOpen(false);
        } else {
          onClose();
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
  }, [isOpen, isRoleOpen, onClose]);

  // 드롭다운 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    };

    if (isRoleOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRoleOpen]);

  if (!isOpen) return null;

  const selectedRole = roleOptions.find((opt) => opt.value === role);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col items-start w-full max-w-[512px] max-h-[90vh] bg-white rounded-[10px] overflow-hidden my-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-row justify-between items-center px-4 sm:px-6 py-4 sm:py-6 w-full border-b border-[#E5E7EB]">
          <h3 className="text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828]">
            メンバー追加
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-[10px] hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <XIcon size={20} color="#6A7282" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-row items-start px-4 sm:px-6 pt-4 pb-0 gap-2 w-full border-b border-[#E5E7EB] overflow-x-auto">
          <button
            onClick={() => onTabChange('email')}
            className={`flex flex-row items-center px-3 sm:px-4 gap-2 h-[46px] transition-colors flex-shrink-0 relative ${
              activeTab === 'email'
                ? 'text-[#9810FA]'
                : 'text-[#4A5565] hover:text-[#101828]'
            }`}
          >
            <MailIcon size={20} color={activeTab === 'email' ? '#9810FA' : '#4A5565'} />
            <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] whitespace-nowrap">
              メールアドレス
            </span>
            {activeTab === 'email' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#9810FA]"></div>
            )}
          </button>
          <button
            onClick={() => onTabChange('link')}
            className={`flex flex-row items-center px-3 sm:px-4 gap-2 h-[46px] transition-colors flex-shrink-0 relative ${
              activeTab === 'link'
                ? 'text-[#9810FA]'
                : 'text-[#4A5565] hover:text-[#101828]'
            }`}
          >
            <LinkIcon size={16} color={activeTab === 'link' ? '#9810FA' : '#4A5565'} />
            <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] whitespace-nowrap">
              リンク
            </span>
            {activeTab === 'link' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#9810FA]"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 gap-4 w-full overflow-y-auto">
          {activeTab === 'email' ? (
            <>
              {/* Role Dropdown */}
              <div className="flex flex-col items-start gap-2 w-full" ref={roleRef}>
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  役割
                </label>
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setIsRoleOpen(!isRoleOpen)}
                    className="w-full h-[43px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828]">
                      {selectedRole?.label || '選択してください'}
                    </span>
                    <ChevronDownIcon
                      size={20}
                      color="#4A5565"
                      className={`transition-transform ${isRoleOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isRoleOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                      {roleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onRoleChange(opt.value as 'administrative-scrivener' | 'assistant');
                            setIsRoleOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Input */}
              <div className="flex flex-col items-start gap-2 w-full">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  メールアドレス
                </label>
                <div className="relative w-full">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <MailIcon size={20} color="#99A1AF" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="example@company.co.jp"
                    className="w-full h-[46px] pl-10 pr-4 text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent placeholder:text-[#99A1AF]"
                  />
                </div>
              </div>

              {/* Message Text Area */}
              <div className="flex flex-col items-start gap-2 w-full">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  メッセージ（任意）
                </label>
                <textarea
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder="招待メッセージを入力..."
                  className="w-full h-[94px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none placeholder:text-[#99A1AF]"
                />
              </div>

              {/* Add Button */}
              <div className="w-full pt-4">
                <button
                  onClick={onAdd}
                  disabled={!email.trim()}
                  className="flex flex-row items-center justify-center px-4 sm:px-6 gap-2 w-full h-12 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MailIcon size={20} color="#FFFFFF" />
                  <span>追加する</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Role Dropdown */}
              <div className="flex flex-col items-start gap-2 w-full" ref={roleRef}>
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  役割
                </label>
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setIsRoleOpen(!isRoleOpen)}
                    className="w-full h-[43px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828]">
                      {selectedRole?.label || '選択してください'}
                    </span>
                    <ChevronDownIcon
                      size={20}
                      color="#4A5565"
                      className={`transition-transform ${isRoleOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isRoleOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                      {roleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onRoleChange(opt.value as 'administrative-scrivener' | 'assistant');
                            setIsRoleOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Invitation Link */}
              <div className="flex flex-col items-start gap-2 w-full">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  招待リンク
                </label>
                <div className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px]">
                  <div className="flex flex-row items-center gap-2">
                    <LinkIcon size={20} color="#99A1AF" />
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] break-all">
                      {inviteLink}
                    </span>
                  </div>
                </div>
              </div>

              {/* Copy and Share Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full pt-4">
                <button
                  onClick={onCopyLink}
                  className="flex flex-row items-center justify-center px-4 sm:px-6 gap-2 h-12 bg-[#4A5565] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#364153] transition-colors flex-1"
                >
                  <CopyIconAlt size={20} color="#FFFFFF" />
                  <span>コピー</span>
                </button>
                <button
                  onClick={onShareLink}
                  className="flex flex-row items-center justify-center px-4 sm:px-6 gap-2 h-12 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors flex-1"
                >
                  <ShareIconAlt size={20} color="#FFFFFF" />
                  <span>共有</span>
                </button>
              </div>

              {/* Warning Message */}
              <div className="w-full p-3 sm:p-4 bg-[#EFF6FF] border border-[#BEDBFF] rounded-[10px]">
                <p className="text-xs font-normal leading-4 text-[#193CB8]">
                  このリンクを使用すると、誰でもチームに参加できます。リンクの共有には注意してください。
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
