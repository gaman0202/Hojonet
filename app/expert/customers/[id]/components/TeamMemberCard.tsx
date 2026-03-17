import { TeamMember } from '../types';

interface TeamMemberCardProps {
  member: TeamMember;
}

export default function TeamMemberCard({ member }: TeamMemberCardProps) {
  const getRoleBadge = () => {
    if (member.role === 'introducer') {
      return (
        <div className="flex items-center justify-center px-3 py-1.5 bg-[#FFE2E2] border border-[#FFE2E2] rounded-full">
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#C10007]">
            紹介者
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center px-3 py-1.5 bg-[#E5E7EB] border border-[#D1D5DC] rounded-full">
        <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
          メンバー
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-row justify-between items-center px-3 sm:px-4 py-3 sm:py-4 gap-3 sm:gap-4 bg-[#F9FAFB] rounded-[10px]">
      <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: member.avatarBg }}
        >
          <span className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px]" style={{ color: member.avatarColor }}>
            {member.nameInitial}
          </span>
        </div>
        <div className="flex flex-col gap-0 min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] truncate">
            {member.name}
          </h4>
          <p className="text-xs font-normal leading-4 text-[#4A5565] truncate">
            {member.email}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0">
        {getRoleBadge()}
      </div>
    </div>
  );
}
