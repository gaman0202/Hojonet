'use client';

import Modal from './Modal';
import {
  RefreshIcon,
  ChevronDownIcon,
  UserIcon,
} from '@/components/icons';
import { TimelineItem } from '../types';
import { getActionIcon } from '../utils';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineItems: TimelineItem[];
}

export default function HistoryModal({
  isOpen,
  onClose,
  timelineItems,
}: HistoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="操作履歴"
      subtitle="すべての変更内容を追跡"
      icon={<RefreshIcon size={20} color="#9810FA" className="lg:w-6 lg:h-6 flex-shrink-0" />}
      maxWidth="max-w-[896px]"
      footer={
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-6 w-full bg-[#F9FAFB]">
          <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565]">
            全{timelineItems.length}件の操作履歴
          </p>
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2 lg:py-2.5 w-full lg:w-auto bg-[#9810FA] rounded-[10px] hover:bg-[#7A0DC8] transition-colors"
          >
            <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-white">
              閉じる
            </span>
          </button>
        </div>
      }
    >
      {/* Filter Section */}
      <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-3 lg:pb-4 w-full bg-[#F9FAFB] border-b border-[#E5E7EB]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-3 lg:gap-4 w-full">
          {/* User Filter */}
          <div className="flex flex-col items-start gap-2 w-full lg:flex-1">
            <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
              ユーザー
            </label>
            <div className="flex flex-row items-center justify-between px-3 py-2 w-full border border-[#D1D5DC] rounded-[10px] cursor-pointer bg-white">
              <span className="text-sm lg:text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828]">
                すべてのユーザー
              </span>
              <ChevronDownIcon size={16} color="#4A5565" className="lg:w-5 lg:h-5" />
            </div>
          </div>
          {/* Action Type Filter */}
          <div className="flex flex-col items-start gap-2 w-full lg:flex-1">
            <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
              アクションタイプ
            </label>
            <div className="flex flex-row items-center justify-between px-3 py-2 w-full border border-[#D1D5DC] rounded-[10px] cursor-pointer bg-white">
              <span className="text-sm lg:text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828]">
                すべてのアクション
              </span>
              <ChevronDownIcon size={16} color="#4A5565" className="lg:w-5 lg:h-5" />
            </div>
          </div>
          {/* Period Filter */}
          <div className="flex flex-col items-start gap-2 w-full lg:flex-1">
            <label className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#364153]">
              期間
            </label>
            <div className="flex flex-row items-center justify-between px-3 py-2 w-full border border-[#D1D5DC] rounded-[10px] cursor-pointer bg-white">
              <span className="text-sm lg:text-base font-normal leading-[19px] tracking-[-0.3125px] text-[#101828]">
                すべて
              </span>
              <ChevronDownIcon size={16} color="#4A5565" className="lg:w-5 lg:h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="flex flex-col items-start gap-2 lg:gap-3 p-4 lg:p-6 w-full">
        {timelineItems.map((item) => {
          const { icon: IconComponent, color } = getActionIcon(item.actionType);
          return (
            <div
              key={item.id}
              className="flex flex-row items-start gap-3 lg:gap-4 p-3 lg:p-[17px] w-full bg-white border border-[#E5E7EB] rounded-[10px]"
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-[10px] flex-shrink-0"
                style={{ backgroundColor: item.actionTypeColor.bg }}
              >
                <IconComponent size={14} color={color} className="lg:w-4 lg:h-4" />
              </div>

              {/* Content */}
              <div className="flex flex-col items-start gap-2 flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-start gap-2 w-full">
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <h3 className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                      {item.actionType}
                    </h3>
                    <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 lg:py-1 rounded-full text-xs font-normal leading-4 flex-shrink-0"
                    style={{
                      backgroundColor: item.roleColor.bg,
                      color: item.roleColor.text,
                    }}
                  >
                    {item.role}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="flex flex-row items-center gap-1 text-xs font-normal leading-4 text-[#6A7282] flex-wrap">
                  <UserIcon size={10} color="#6A7282" className="lg:w-3 lg:h-3" />
                  <span className="truncate">{item.author}</span>
                  <span>•</span>
                  <span className="truncate">{item.dateTime}</span>
                  {item.targetType && (
                    <>
                      <span>•</span>
                      <span className="text-[#9810FA] truncate">
                        {item.targetType}: {item.targetValue || ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
