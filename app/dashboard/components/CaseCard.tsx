// app/dashboard/components/CaseCard.tsx

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChatBubbleIcon, ClockIcon, CalendarIcon, DocumentIcon } from '@/components/icons'
import { CaseCard as CaseCardType } from '../types'

interface CaseCardProps {
  caseData: CaseCardType
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const router = useRouter()
  const getTagStyle = (tag: string) => {
    if (tag === 'document-prep') {
      return 'bg-[#F3F4F6] text-[#6A7282] px-2'
    }
    if (tag === '申請完了') {
      return 'bg-[#F3F4F6] text-[#6A7282] px-2'
    }
    if (tag === '対応必要') {
      return 'bg-[#FEE2E2] text-[#DC2626]'
    }
    if (tag === '審査中') {
      return 'bg-[#FEF3C7] text-[#D97706]'
    }
    if (tag === 'ヒアリング中') {
      return 'bg-[#FEF9C3] text-[#CA8A04]'
    }
    return 'bg-[#F3F4F6] text-[#364153]'
  }

  const handleClick = () => {
    if (caseData?.id) {
      router.push(`/dashboard/cases/${caseData.id}`)
    } else {
      console.warn('caseData.id is undefined', caseData)
    }
  }

  // 기존 tags 그대로 사용 (申請案件 배지 추가 제거)
  const tags = caseData.tags ?? []

  // DB가 0이거나 공백일 때는 표시하지 않음
  const amountStr = caseData.amount != null ? String(caseData.amount).trim() : ''
  const hasAmount = amountStr !== '' && amountStr !== '0'
  const hasDocuments = typeof caseData.documents === 'number' && caseData.documents > 0
  const hasMessages = typeof caseData.messages === 'number' && caseData.messages > 0

  return (
    <div
      className="flex flex-col items-start p-[16px] lg:p-6 gap-[12px] lg:gap-3 w-full bg-white border-[0.57px] border-[#E5E7EB] rounded-[10px] lg:rounded-[14px] cursor-pointer"
      onClick={() => router.push(`/dashboard/cases/${caseData.id}`)}
    >
      {/* Main Content Row */}
      <div className="flex flex-row justify-between items-start w-full gap-4">
        {/* Left Column */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Tags */}
          <div className="flex flex-row items-center gap-2 flex-nowrap">
            {tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className={`py-0.5 rounded-full text-xs leading-4 tracking-[-0.15px] flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${getTagStyle(tag)} ${tag !== 'document-prep' && tag !== '申請完了' ? 'px-2' : ''}`}
              >
                {tag === '対応必要' && (
                  <Image 
                    src="/icons/exclamation.svg" 
                    alt="exclamation" 
                    width={12} 
                    height={12} 
                    className="hidden sm:block w-3 h-3"
                  />
                )}
                <span>{tag}</span>
              </span>
            ))}
          </div>

          {/* Title with Status Badge */}
          <div className="flex flex-row items-center gap-2 flex-wrap">
            {caseData.status && (
              <span className="hidden lg:inline-flex items-center justify-center px-3 py-1 bg-[#155DFC] rounded-full text-sm text-[#DBEAFE] leading-5 tracking-[-0.150391px] font-medium">
                {caseData.status}
              </span>
            )}
            <h3 className="text-base font-medium leading-6 tracking-[-0.3125px] text-[#0A0A0A] lg:text-xl lg:leading-7 lg:tracking-[-0.449219px] lg:text-[#101828]">
              {caseData.title}
            </h3>
          </div>

          {/* Details */}
          {/* Mobile: Icon version */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex flex-row items-center gap-2 text-sm text-[#6A7282] leading-5 tracking-[-0.150391px] lg:hidden">
              <div className="flex flex-row items-center gap-1">
                <CalendarIcon size={16} color="#6A7282" />
                <span>締切: {caseData.deadline}</span>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2 text-sm text-[#6A7282] leading-5 tracking-[-0.150391px] lg:hidden">
            <div className="flex flex-row items-center gap-1">
                <DocumentIcon size={16} color="#6A7282" />
                <span>進捗: {caseData.progress}%</span>
              </div>
            </div>
          </div>
          {/* PC: Icon version */}
          <div className="hidden lg:flex flex-row items-center gap-4 text-sm text-[#4A5565] leading-5 tracking-[-0.150391px]">
            <div className="flex flex-row items-center gap-1">
              <CalendarIcon size={16} color="#4A5565" />
              <span>締切: {caseData.deadline}</span>
            </div>
            <div className="flex flex-row items-center gap-1">
              <DocumentIcon size={16} color="#4A5565" />
              <span>進捗: {caseData.progress}%</span>
            </div>
          </div>
        </div>

        {/* Right Column - Amount + Counts */}
        <div className="flex flex-col items-end gap-1 lg:gap-2 flex-shrink-0">
          {/* Amount: hide when empty or "0" */}
          {hasAmount && (
            <>
              {/* Mobile: Amount only */}
              <span className="text-lg font-semibold leading-7 tracking-[-0.439453px] text-[#155DFC] text-right lg:hidden">
                {caseData.amount}
              </span>

              {/* PC: 支援金額 label and Amount */}
              <div className="hidden lg:flex flex-col items-end gap-2">
                <span className="text-sm text-[#6A7282] leading-5 tracking-[-0.150391px] text-right">
                  支援金額
                </span>
                <span className="text-2xl font-medium leading-8 tracking-[0.0703125px] text-[#155DFC] text-right">
                  {caseData.amount}
                </span>
              </div>
            </>
          )}

          {/* Mobile: Count Indicators - small circles (hide when 0 or empty) */}
          {(hasDocuments || hasMessages) && (
            <div className="flex flex-row justify-end items-center gap-2 min-h-[18px] lg:hidden">
              {hasDocuments && (
                <div className="flex flex-row items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#DC2626] opacity-20"></div>
                  <span className="text-xs leading-4 text-[#DC2626] text-right">
                    {caseData.messages}件
                  </span>
                </div>
              )}
              {hasMessages && (
                <div className="flex flex-row items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#EA580C] opacity-20"></div>
                  <span className="text-xs leading-4 text-[#EA580C] text-right">
                    {caseData.documents}件
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PC: Count Indicators - badge style (hide when 0 or empty) */}
          {(hasDocuments || hasMessages) && (
            <div className="hidden lg:flex flex-row items-center gap-2 h-7">
              {hasMessages && (
                <div className="flex flex-row items-center px-3 py-1.5 gap-2 bg-[#FFE2E2] rounded-[10px] h-7">
                  <ChatBubbleIcon size={16} color="#E7000B" />
                  <span className="text-sm text-[#E7000B] leading-5 tracking-[-0.150391px]">
                    {caseData.messages}件
                  </span>
                </div>
              )}
              {hasDocuments && (
                <div className="flex flex-row items-center px-3 py-1.5 gap-2 bg-[#FFEDD4] rounded-[10px] h-7">
                  <ClockIcon size={16} color="#E7000B" />
                  <span className="text-sm text-[#E7000B] leading-5 tracking-[-0.150391px]">
                    {caseData.documents}件
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden lg:h-2">
        <div
          className="h-full rounded-full"
          style={{
            width: `${caseData.progress}%`,
            backgroundColor: caseData.progressColor || '#155DFC',
          }}
        />
      </div>
      {/* Assignee */}
        <p className="text-xs font-normal leading-4 text-[#6A7282]">
          担当: {caseData.assignee}
        </p>
    </div>
    
  )
}
