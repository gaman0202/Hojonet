import { DeleteIconAlt, DragHandleIcon } from '@/components/icons';
import { Step } from '../types';

interface StepCardProps {
  step: Step;
  onStepChange: (id: number, field: keyof Step, value: string | number) => void;
  onDelete: (id: number) => void;
}

export function StepCard({ step, onStepChange, onDelete }: StepCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px]">
      <div className="flex flex-row gap-3 items-start">
        {/* Drag + 番号 */}
        <div className="flex flex-col items-center gap-1">
          <DragHandleIcon size={20} color="#99A1AF" />
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
            #{step.id}
          </span>
        </div>

        {/* contentArea */}
        <div className="flex flex-col gap-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ステップ名 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal leading-4 text-[#4A5565]">
                ステップ名
              </label>
              <input
                type="text"
                value={step.stepName}
                onChange={(e) =>
                  onStepChange(step.id, 'stepName', e.target.value)
                }
                placeholder="事前確認"
                className="w-full h-[38px] px-3 py-2 text-sm font-normal leading-5 tracking-[-0.150391px]
                           text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC]
                           rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA]
                           focus:border-transparent"
              />
            </div>

            {/* サブタイトル */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal leading-4 text-[#4A5565]">
                サブタイトル
              </label>
              <input
                type="text"
                value={step.subtitle}
                onChange={(e) =>
                  onStepChange(step.id, 'subtitle', e.target.value)
                }
                placeholder="補助金の対象かチェック"
                className="w-full h-[38px] px-3 py-2 text-sm font-normal leading-5 tracking-[-0.150391px]
                           text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC]
                           rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA]
                           focus:border-transparent"
              />
            </div>

            {/* 説明（textarea・1行表示） */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-normal leading-4 text-[#4A5565]">
                説明
              </label>
              <textarea
                rows={1}
                value={step.description}
                onChange={(e) =>
                  onStepChange(step.id, 'description', e.target.value)
                }
                placeholder="このステップの説明を入力"
                className="w-full h-[100px] px-3 py-2 text-sm font-normal leading-5 tracking-[-0.150391px]
                           text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC]
                           rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA]
                           focus:border-transparent resize-none overflow-hidden"
              />
            </div>

            {/* 予想日数 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal leading-4 text-[#4A5565]">
                予想日数
              </label>
              <div className="flex flex-row items-center gap-2">
                <input
                  type="number"
                  value={step.estimatedDays}
                  onChange={(e) =>
                    onStepChange(
                      step.id,
                      'estimatedDays',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-24 h-[38px] px-3 py-2 text-sm font-normal leading-5 tracking-[-0.150391px]
                             text-[#0A0A0A] bg-white border border-[#D1D5DC]
                             rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA]
                             focus:border-transparent"
                />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  日
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 削除 */}
        <button
          onClick={() => onDelete(step.id)}
          className="p-2 rounded-[10px] hover:bg-gray-100 transition-colors flex-shrink-0 mt-1"
        >
          <DeleteIconAlt size={20} color="#FB2C36" />
        </button>
      </div>
    </div>
  );
}
