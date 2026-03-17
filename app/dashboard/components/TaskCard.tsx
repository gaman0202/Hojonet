// app/dashboard/components/TaskCard.tsx

import Link from 'next/link'
import { Task } from '../types'
import { ClockIcon } from '@/components/icons'

interface TaskCardProps {
  task: Task
  isLast?: boolean
}

export default function TaskCard({ task, isLast = false }: TaskCardProps) {
  // ✅ 2 / 4 / 6 日後만 clocknoback, 나머지는 date
  const iconSrc = [2, 4, 6].includes(task.daysRemaining) ? '/icons/clocknoback.svg' : '/icons/date.svg'

  return (
    <div
      className={`flex flex-row items-start px-4 lg:px-6 py-4 lg:py-4 gap-4 lg:gap-6 w-full ${
        !isLast ? 'border-b border-[#E5E7EB]' : ''
      }`}
    >
      <div className="flex flex-col gap-1 lg:gap-2 flex-grow">
        <div className="flex flex-row items-center gap-2 lg:gap-2">
          <div className="w-2 h-2 lg:w-2 lg:h-2 bg-[#E7000B] rounded-full"></div>
          <h4 className="text-sm lg:text-base font-medium leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-[#0A0A0A] lg:text-[#101828]">
            {task.title}
          </h4>
        </div>

        <p className="text-xs lg:text-sm text-[#6A7282] leading-4 lg:leading-5 tracking-[-0.150391px]">
          {task.caseTitle}
        </p>

{/* PC: Icon version */}
        <div className="hidden lg:flex flex-row items-center gap-4 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">
          <div className="flex flex-row items-center gap-1 lg:gap-1">
          <ClockIcon size={16} color="#E7000B" />
            <span className="text-xs lg:text-sm text-[#E7000B] leading-4 lg:leading-5 tracking-[-0.150391px]">
              {task.daysRemaining < 0
                ? `${Math.abs(task.daysRemaining)}日超過`
                : task.daysRemaining === 0
                  ? '今日が期限'
                  : `${task.daysRemaining} 日後`}
            </span>
          </div>
        </div>
{/* Details */}
{/* Mobile: Emoji version */}
        <p className="flex flex-row items-center gap-1 lg:gap-1 lg:hidden" >
          <span className="text-xs lg:text-sm text-[#E7000B] leading-4 lg:leading-5 tracking-[-0.150391px]">
            ⏰{task.daysRemaining < 0
              ? `${Math.abs(task.daysRemaining)}日超過`
              : task.daysRemaining === 0
                ? '今日が期限'
                : `${task.daysRemaining} 日後`}
          </span>
        </p>
      </div>

      <Link
        href={`/dashboard/cases/${task.caseId}`}
        className="flex justify-center items-center px-0 py-2 h-auto lg:h-9 text-xs lg:text-sm font-medium lg:font-normal text-[#155DFC] leading-4 lg:leading-5 tracking-[-0.150391px] rounded-[10px] hover:bg-gray-50 transition-colors"
      >
        詳細 →
      </Link>
    </div>
  )
}
