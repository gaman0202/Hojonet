'use client';

import Modal from './Modal';
import { MailIcon, LinkIcon } from '@/components/icons';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberRole: 'member' | 'introducer';
  setMemberRole: (role: 'member' | 'introducer') => void;
  memberEmail: string;
  setMemberEmail: (email: string) => void;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  memberRole,
  setMemberRole,
  memberEmail,
  setMemberEmail,
}: AddMemberModalProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://hojonet.com/invite/abc123');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="メンバーを追加"
      subtitle="案件にメンバーを招待します"
      maxWidth="max-w-[480px]"
      footer={
        <div className="flex flex-row justify-end items-center gap-3 px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2.5 border border-[#D1D5DC] rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
          >
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153]">
              キャンセル
            </span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2.5 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors"
          >
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white">
              招待を送信
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Role Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            役割
          </label>
          <div className="flex flex-row gap-3">
            <button
              onClick={() => setMemberRole('member')}
              className={`flex-1 py-2.5 px-4 rounded-[10px] border transition-colors ${
                memberRole === 'member'
                  ? 'border-[#155DFC] bg-[#EFF6FF] text-[#155DFC]'
                  : 'border-[#D1D5DC] bg-white text-[#364153]'
              }`}
            >
              メンバー
            </button>
            <button
              onClick={() => setMemberRole('introducer')}
              className={`flex-1 py-2.5 px-4 rounded-[10px] border transition-colors ${
                memberRole === 'introducer'
                  ? 'border-[#155DFC] bg-[#EFF6FF] text-[#155DFC]'
                  : 'border-[#D1D5DC] bg-white text-[#364153]'
              }`}
            >
              紹介者
            </button>
          </div>
        </div>

        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            メールアドレス
          </label>
          <div className="flex flex-row items-center gap-2 px-3 py-2.5 border border-[#D1D5DC] rounded-[10px]">
            <MailIcon size={20} color="#99A1AF" />
            <input
              type="email"
              placeholder="email@example.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="flex-1 text-base leading-5 placeholder:text-[#99A1AF] focus:outline-none"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex flex-row items-center gap-3">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-sm text-[#6A7282]">または</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        {/* Copy Link */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            招待リンクをコピー
          </label>
          <button
            onClick={handleCopyLink}
            className="flex flex-row items-center gap-2 px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] hover:bg-[#F9FAFB] transition-colors"
          >
            <LinkIcon size={20} color="#155DFC" />
            <span className="flex-1 text-left text-sm text-[#155DFC] leading-5 truncate">
              https://hojonet.com/invite/abc123
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
