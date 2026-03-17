'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon, RefreshIcon } from '@/components/icons';
import { TimelineItem } from '../types';
import { getActionIcon } from '../utils';

interface TimelineTabProps {
  timelineItems: TimelineItem[];
  timelineLoading?: boolean;
  onOpenHistoryModal: () => void;
}

export default function TimelineTab({
  timelineItems,
  timelineLoading = false,
  onOpenHistoryModal,
}: TimelineTabProps) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(timelineItems.map((item) => item.role)));
    return [{ value: 'all', label: '全活動' }, ...roles.map((role) => ({ value: role, label: role }))];
  }, [timelineItems]);

  const actionOptions = useMemo(() => {
    const actionTypes = Array.from(new Set(timelineItems.map((item) => item.actionType)));
    return [{ value: 'all', label: '全タイプ' }, ...actionTypes.map((action) => ({ value: action, label: action }))];
  }, [timelineItems]);

  const filteredTimelineItems = useMemo(
    () =>
      timelineItems.filter((item) => {
        const matchesRole = selectedRoleFilter === 'all' || item.role === selectedRoleFilter;
        const matchesAction = selectedActionFilter === 'all' || item.actionType === selectedActionFilter;
        return matchesRole && matchesAction;
      }),
    [timelineItems, selectedRoleFilter, selectedActionFilter]
  );

  return (
    <div className="flex flex-col items-start p-4 lg:p-6 w-full bg-[#F9FAFB]">
      {/* Filter Section */}
      <div className="flex flex-col items-start p-3 lg:p-[17px] gap-3 w-full bg-white border border-[#E5E7EB] rounded-[10px] mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 w-full">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-[13px] w-full lg:flex-1">
            {/* Role Dropdown */}
            <div className="relative w-full lg:w-auto lg:max-w-[220px]">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="w-full appearance-none border border-[#D1D5DC] bg-white px-3 pr-10 py-2 rounded-[10px] text-sm font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                color="#4A5565"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
            {/* Action Dropdown */}
            <div className="relative w-full lg:w-auto lg:max-w-[220px]">
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="w-full appearance-none border border-[#D1D5DC] bg-white px-3 pr-10 py-2 rounded-[10px] text-sm font-normal leading-[19px] tracking-[-0.3125px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                color="#4A5565"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
          <span className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#6A7282] w-full lg:w-auto text-center lg:text-left">
            総 {filteredTimelineItems.length}個活動
          </span>
        </div>
      </div>

      {/* Timeline Items */}
      <div className="flex flex-col items-start gap-3 lg:gap-4 w-full">
        {timelineLoading ? (
          <div className="flex items-center justify-center py-12 w-full">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#155DFC] rounded-full animate-spin" />
          </div>
        ) : filteredTimelineItems.length === 0 ? (
          <p className="text-sm text-[#6A7282] py-8 w-full text-center">活動履歴がありません</p>
        ) : (
        filteredTimelineItems.map((item, index) => (
          <div key={item.id} className="flex flex-row items-start gap-3 lg:gap-4 w-full">
            {/* Avatar and Line */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full"
                style={{ backgroundColor: item.avatarBg }}
              >
                <span className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-white">
                  {item.authorInitial}
                </span>
              </div>
              {/* Connecting Line */}
              {index < filteredTimelineItems.length - 1 && (
                <div className="w-[2px] flex-1 bg-[#E5E7EB] min-h-[80px] lg:min-h-[90px]" />
              )}
            </div>

            {/* Timeline Card */}
            <div className="flex flex-col items-start p-3 lg:p-[17px] gap-2 lg:gap-3 flex-1 bg-white border border-[#E5E7EB] rounded-[10px]">
              {/* Header Row */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-start gap-2 lg:gap-4 w-full">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 flex-1 w-full lg:w-auto">
                  <h3 className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                    {item.author}
                  </h3>
                  <div className="flex flex-row items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 lg:py-1 rounded text-xs font-normal leading-4"
                      style={{
                        backgroundColor: item.roleColor.bg,
                        color: item.roleColor.text,
                      }}
                    >
                      {item.role}
                    </span>
                    <span
                      className="px-2 py-0.5 lg:py-1 rounded text-xs font-normal leading-4 border flex items-center gap-1"
                      style={{
                        backgroundColor: item.actionTypeColor.bg,
                        borderColor: item.actionTypeColor.border,
                        color: item.actionTypeColor.text,
                      }}
                    >
                      {(() => {
                        const { icon: IconComponent } = getActionIcon(item.actionType);
                        return <IconComponent size={12} color={item.actionTypeColor.text} />;
                      })()}
                      {item.actionType}
                    </span>
                  </div>
                </div>
                <span className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#6A7282] flex-shrink-0">
                  {item.date} {item.time}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs lg:text-sm font-normal leading-5 lg:leading-[23px] tracking-[-0.150391px] text-[#364153]">
                {item.description}
              </p>

              {/* Target Info */}
              {item.targetType && (
                <div className="flex flex-row items-center gap-2 flex-wrap">
                  <span className="text-xs font-normal leading-4 text-[#6A7282]">対象:</span>
                  <span className="px-2 py-0.5 lg:py-1 bg-[#F3F4F6] rounded text-xs font-normal leading-4 text-[#364153]">
                    {item.targetType}: {item.targetValue || ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))
        )}
      </div>

      {/* Operation History Notice */}
      <button
        onClick={onOpenHistoryModal}
        className="flex flex-col items-start p-3 lg:p-[17px] gap-1 lg:gap-1 w-full bg-[#EFF6FF] border border-[#BEDBFF] rounded-[10px] mt-4 lg:mt-6 hover:bg-[#DBEAFE] transition-colors text-left"
      >
        <div className="flex flex-row items-center gap-2">
          <RefreshIcon size={16} color="#155DFC" className="lg:w-5 lg:h-5" />
          <h4 className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#1C398E]">
            操作履歴注意
          </h4>
        </div>
        <p className="text-xs lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] text-[#1447E6] pl-6 lg:pl-8">
          すべての変更は自動的に記録され、3年間保管されます。法的紛争時証拠資料として利用できます。
        </p>
      </button>
    </div>
  );
}
