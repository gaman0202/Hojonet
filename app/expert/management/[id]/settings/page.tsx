'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { use } from 'react';
import Link from 'next/link';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import {
  ArrowLeftIcon,
  PlusIcon,
  SaveIcon,
  DeleteIconAlt,
} from '@/components/icons';
import { StepCard } from './StepCard';
import { Step } from '../types';

const defaultSteps: Step[] = [
  { id: 1, stepName: '', subtitle: '', description: '', estimatedDays: 3 },
  { id: 2, stepName: '', subtitle: '', description: '', estimatedDays: 7 },
];

export default function CaseDetailsSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [steps, setSteps] = useState<Step[]>(defaultSteps);
  const [hearingQuestions, setHearingQuestions] = useState<string[]>([]);
  const [tasks, setTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/expert/subsidies/${id}/settings`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { steps?: Step[]; hearingQuestions?: string[]; tasks?: string[] }) => {
        if (cancelled) return;
        if (Array.isArray(data.steps) && data.steps.length > 0) setSteps(data.steps);
        if (Array.isArray(data.hearingQuestions)) setHearingQuestions(data.hearingQuestions);
        if (Array.isArray(data.tasks)) setTasks(data.tasks.length ? data.tasks : []);
      })
      .catch(() => { if (!cancelled) setSteps(defaultSteps); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expert/subsidies/${id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, hearingQuestions, tasks }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || '保存に失敗しました');
        return;
      }
      alert('保存しました');
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [id, steps, hearingQuestions, tasks, saving]);

  const handleStepChange = (id: number, field: keyof Step, value: string | number) => {
    setSteps(
      steps.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    );
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: steps.length + 1,
        stepName: '',
        subtitle: '',
        description: '',
        estimatedDays: 0,
      },
    ]);
  };

  const handleDeleteStep = (id: number) => {
    setSteps(steps.filter((step) => step.id !== id));
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <ExpertSidebar activeItem="management" />

      {/* Main Content */}
      <main className="flex flex-col items-center w-full min-w-0 lg:ml-[255px]">
        {/* Header Section - padding: 16px 54.5px 1px */}
        <div className="flex flex-row justify-between items-center px-4 lg:px-[54.5px] pt-4 pb-6 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4">
            <Link
              href={`/expert/management/${id}`}
              className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ArrowLeftIcon size={20} color="#4A5565" />
              <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                戻る
              </span>
            </Link>
            <h1 className="text-xl lg:text-2xl font-normal leading-7 lg:leading-8 tracking-[0.0703125px] text-[#101828]">
              案件の詳細設定
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex flex-row items-center justify-center gap-2 px-6 py-2.5 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon size={20} color="#FFFFFF" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white">
              {saving ? '保存中...' : '保存'}
            </span>
          </button>
        </div>

        {/* Content Section - padding: 0px, gap: 32px */}
        <div className="flex flex-col items-start px-4 lg:px-6 py-6 lg:py-8 gap-6 lg:gap-8 w-full max-w-[976px]">
          <TemplateCard
            title="ヒアリングテンプレート"
            description="ユーザーがこの補助金に申請する際に回答するヒアリング項目を設定します。"
            sectionTitle="ヒアリング質問"
            items={hearingQuestions}
            setItems={setHearingQuestions}
            emptyMessage="まだ質問がありません"
            emptyButtonText="最初の質問を追加"
            addButtonText="質問を追加"
            inputPlaceholder="質問を入力"
          />

          <TemplateCard
            title="タスクテンプレート"
            description="この補助金で新規案件を作成する際に自動的に追加される基本タスクを設定します。案件ごとに後から編集可能です。"
            items={tasks}
            setItems={setTasks}
            emptyMessage="まだタスクが登録されていません"
            emptyButtonText="最初のタスクを追加"
            addButtonText="タスクを追加"
            inputPlaceholder="タスクを入力"
            hintText="💡 ヒント: ここで設定したタスクは、この補助金で新規案件を作成する際に自動的に追加されます。案件ごとに後から追加・編集・削除可能です。"
            hideHeaderAdd
          />

          {/* Progress Stage Settings Section - padding: 25px 25px 1px, gap: 16px */}
          <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-4">
              <div className="flex flex-col gap-2 flex-1">
                <h2 className="text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828]">
                  進行段階設定
                </h2>
                <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  顧客に表示される申請フローガイドのステップを設定します。顧客画面の進行度として表示されます。
                </p>
              </div>
              <button
                onClick={handleAddStep}
                className="flex flex-row items-center justify-center px-3 gap-2 h-9 bg-[#DBEAFE] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-[#1447E6] hover:bg-[#BFDBFE] transition-colors whitespace-nowrap"
              >
                <PlusIcon size={16} color="#1447E6" />
                <span>ステップを追加</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 w-full">
              {steps.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  onStepChange={handleStepChange}
                  onDelete={handleDeleteStep}
                />
              ))}
            </div>

            <HintBox>
              <p>💡 ヒント: これらのステップは顧客ワークスペースの「進行ガイド」に円形プログレスバーとして表示されます。</p>
              <ul className="flex flex-col gap-1 list-disc list-inside">
                <li>各ステップは申請の流れを分かりやすく示します</li>
                <li>顧客が現在の進捗状況を一目で理解できます</li>
                <li>専門家は案件ごとに進行状況を更新できます</li>
              </ul>
            </HintBox>
          </div>
        </div>
      </main>
    </div>
  );
}

interface TemplateCardProps {
  title: string;
  description: string;
  sectionTitle?: string;
  items: string[];
  setItems: (items: string[]) => void;
  emptyMessage: string;
  emptyButtonText: string;
  addButtonText: string;
  inputPlaceholder: string;
  hintText?: ReactNode;
  hideHeaderAdd?: boolean;
}

function TemplateCard({
  title,
  description,
  sectionTitle,
  items,
  setItems,
  emptyMessage,
  emptyButtonText,
  addButtonText,
  inputPlaceholder,
  hintText,
  hideHeaderAdd,
}: TemplateCardProps) {
  const handleAdd = () => setItems([...items, '']);
  const handleDelete = (index: number) =>
    setItems(items.filter((_, idx) => idx !== index));
  const handleChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    setItems(updated);
  };

  return (
    <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
      <div className="flex flex-col gap-2 w-full mb-4">
        <h2 className="text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828]">
          {title}
        </h2>
        <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-row justify-between items-center">
          <h3 className="text-lg font-normal leading-6 tracking-[-0.439453px] text-[#101828]">
            {sectionTitle}
          </h3>
          {!hideHeaderAdd && (
            <button
              onClick={handleAdd}
              className="flex flex-row items-center justify-center px-4 gap-2 h-10 bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors"
            >
              <PlusIcon size={16} color="#FFFFFF" />
              <span>{addButtonText}</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3 w-full min-h-[120px] bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DC] rounded-[14px]">
            <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#6A7282]">
              {emptyMessage}
            </p>
            <button
              onClick={handleAdd}
              className="flex flex-row items-center justify-center px-6 gap-2 h-12 bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors"
            >
              <PlusIcon size={20} color="#FFFFFF" />
              <span>{emptyButtonText}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-row items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  placeholder={inputPlaceholder}
                  className="form-input flex-1"
                />
                <button
                  onClick={() => handleDelete(idx)}
                  className="p-2 text-[#FB2C36] hover:opacity-80"
                >
                  <DeleteIconAlt size={20} color="#FB2C36" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {hintText && <HintBox>{hintText}</HintBox>}
    </div>
  );
}

function HintBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 p-3 sm:p-[13px] w-full bg-[#EFF6FF] border border-[#BEDBFF] rounded-[10px] mt-4">
      <div className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#193CB8]">
        {children}
      </div>
    </div>
  );
}
