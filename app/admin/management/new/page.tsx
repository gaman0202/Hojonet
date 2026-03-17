'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import {
  ArrowLeftIcon,
  PlusIcon,
  SaveIcon,
  DeleteIconAlt,
  ChevronDownIcon,
} from '@/components/icons';
import { StepCard } from '../components';
import { Step } from '../types';
import { REGION_OPTIONS, DEFAULT_STEPS } from '../data';
import { validateApplicationPeriodEnd } from '@/lib/admin/subsidies';

export default function GrantRegistrationPage() {
  // Form State
  const [subsidyName, setSubsidyName] = useState('');
  const [implementingAgency, setImplementingAgency] = useState('');
  const [region, setRegion] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [subsidyRate, setSubsidyRate] = useState('');
  const [overview, setOverview] = useState('');

  // Dynamic Lists
  const [eligibleActivities, setEligibleActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [eligibilityConditions, setEligibilityConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [newDocument, setNewDocument] = useState('');
  const [hearingQuestions, setHearingQuestions] = useState<string[]>([]);
  const [tasks, setTasks] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // List Handlers
  const handleAddItem = (
    newItem: string,
    setNewItem: (val: string) => void,
    list: string[],
    setList: (val: string[]) => void
  ) => {
    if (newItem.trim()) {
      setList([...list, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleDeleteItem = (index: number, list: string[], setList: (val: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };

  // Step Handlers
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

  const handleStepChange = (id: number, field: keyof Step, value: string | number) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, [field]: value } : step)));
  };

  const isFormValid = subsidyName && implementingAgency && region && amount && deadline && overview;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaveError(null);
    setDeadlineError(null);
    const deadlineValidation = validateApplicationPeriodEnd(deadline);
    if (!deadlineValidation.valid) {
      setDeadlineError(deadlineValidation.error ?? '申請期限を正しく入力してください。');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/subsidies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subsidyName,
          implementingAgency,
          region: region === '選択してください' ? '' : region,
          amountDescription: amount,
          applicationPeriodEnd: deadline,
          subsidyRate: subsidyRate || undefined,
          overview,
          eligibleActivities: eligibleActivities.filter(Boolean),
          eligibilityConditions: eligibilityConditions.filter(Boolean),
          requiredDocuments: requiredDocuments.filter(Boolean),
          steps: steps.map((s) => ({
            stepName: s.stepName,
            subtitle: s.subtitle,
            description: s.description,
            estimatedDays: s.estimatedDays,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || '保存に失敗しました');
        return;
      }
      window.location.href = '/admin/management';
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="management" />

      {/* Main Content */}
      <main className="flex flex-col items-start w-full min-w-0">
        {/* Header Section */}
        <div className="flex flex-row justify-between items-center px-4 lg:px-6 py-4 gap-3 lg:gap-6 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-2 lg:gap-6 flex-1 min-w-0">
            <Link
              href="/admin/management"
              className="flex flex-row items-center gap-1.5 lg:gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <ArrowLeftIcon size={18} color="#4A5565" className="lg:w-5 lg:h-5" />
              <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                戻る
              </span>
            </Link>
            <h1 className="text-base lg:text-2xl font-normal leading-6 lg:leading-8 tracking-[0.0703125px] text-[#101828] truncate flex-1 min-w-0">
              新規補助金を登録
            </h1>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 hidden sm:block">{saveError}</p>
          )}
          <button
            onClick={handleSave}
            disabled={!isFormValid || saving}
            className={`flex flex-row items-center justify-center gap-1 lg:gap-2 px-2.5 lg:px-6 h-9 lg:h-11 rounded-[10px] text-xs lg:text-base font-normal leading-4 lg:leading-6 tracking-[-0.3125px] text-white transition-colors flex-shrink-0 ${
              isFormValid
                ? 'bg-[#9810FA] hover:bg-[#8200DB] cursor-pointer'
                : 'bg-[#D1D5DC] cursor-not-allowed'
            }`}
          >
            <SaveIcon size={16} color="#FFFFFF" className="lg:w-5 lg:h-5" />
            <span>{saving ? '保存中...' : '保存'}</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 py-6 lg:py-6 pb-20 lg:pb-8 gap-6 lg:gap-6 w-full lg:w-[95%] mx-auto">
          {/* Basic Information Card */}
          <div className="flex flex-col items-start p-4 lg:p-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <h2 className="text-xl lg:text-xl font-normal leading-7 lg:leading-7 tracking-[-0.44921875px] text-[#101828] mb-4 lg:mb-6">
              基本情報
            </h2>

            <div className="flex flex-col gap-4 lg:gap-7 w-full">
              {/* Subsidy Name */}
              <FormField label="補助金名" required>
                <input
                  type="text"
                  value={subsidyName}
                  onChange={(e) => setSubsidyName(e.target.value)}
                  placeholder="例: 令和6年度ものづくり補助金"
                  className="form-input"
                />
              </FormField>

              {/* Implementing Agency and Region */}
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <FormField label="実施機関" required className="flex-1">
                  <input
                    type="text"
                    value={implementingAgency}
                    onChange={(e) => setImplementingAgency(e.target.value)}
                    placeholder="例: 経済産業省"
                    className="form-input"
                  />
                </FormField>
                <FormField label="地域" required className="flex-1">
                  <div className="relative">
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="form-select"
                    >
                      {REGION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDownIcon size={20} color="#4A5565" />
                    </div>
                  </div>
                </FormField>
              </div>

              {/* Amount and Deadline */}
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <FormField label="補助金額" required className="flex-1">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="例: 最大1,000万円"
                    className="form-input"
                  />
                </FormField>
                <FormField label="申請期限" required className="flex-1">
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      setDeadlineError(null);
                    }}
                    onBlur={() => {
                      if (deadline.trim()) {
                        const result = validateApplicationPeriodEnd(deadline);
                        setDeadlineError(result.valid ? null : (result.error ?? null));
                      }
                    }}
                    placeholder="例: 2025年3月31日"
                    className="form-input"
                    style={deadlineError ? { borderColor: 'rgb(239 68 68)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : undefined}
                  />
                  {deadlineError && (
                    <p className="text-sm text-red-600 mt-1">{deadlineError}</p>
                  )}
                </FormField>
              </div>

              {/* Target Industry and Subsidy Rate */}
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <FormField label="対象業種" className="flex-1">
                  <input
                    type="text"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    placeholder="例: 製造業・小売業"
                    className="form-input"
                  />
                </FormField>
                <FormField label="補助率" className="flex-1">
                  <input
                    type="text"
                    value={subsidyRate}
                    onChange={(e) => setSubsidyRate(e.target.value)}
                    placeholder="例: 2/3"
                    className="form-input"
                  />
                </FormField>
              </div>

              {/* Overview */}
              <FormField label="概要" required>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  placeholder="補助金の概要を入力してください"
                  className="form-textarea"
                />
              </FormField>

              {/* Dynamic List Fields */}
              <DynamicListField
                label="対象となる取組"
                items={eligibleActivities}
                newItem={newActivity}
                setNewItem={setNewActivity}
                onAdd={() => handleAddItem(newActivity, setNewActivity, eligibleActivities, setEligibleActivities)}
                onDelete={(idx) => handleDeleteItem(idx, eligibleActivities, setEligibleActivities)}
                placeholder="例: DX推進"
                addButtonText="+ 取組を追加"
              />

              <DynamicListField
                label="対象条件"
                items={eligibilityConditions}
                newItem={newCondition}
                setNewItem={setNewCondition}
                onAdd={() => handleAddItem(newCondition, setNewCondition, eligibilityConditions, setEligibilityConditions)}
                onDelete={(idx) => handleDeleteItem(idx, eligibilityConditions, setEligibilityConditions)}
                placeholder="例: 中小企業"
                addButtonText="+ 条件を追加"
              />

              <DynamicListField
                label="必要書類"
                items={requiredDocuments}
                newItem={newDocument}
                setNewItem={setNewDocument}
                onAdd={() => handleAddItem(newDocument, setNewDocument, requiredDocuments, setRequiredDocuments)}
                onDelete={(idx) => handleDeleteItem(idx, requiredDocuments, setRequiredDocuments)}
                placeholder="例: 事業計画書"
                addButtonText="+ 書類を追加"
              />
            </div>
          </div>

          {/* Hearing Template Card */}
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

          {/* Task Template Card */}
          <TemplateCard
            title="タスクテンプレート"
            description="この補助金で新規案件を作成する際に自動的に追加される基本タスクを設定します。案件ごとに後から編集可能です。"
            items={tasks}
            setItems={setTasks}
            emptyMessage="まだタスクが登録されていません"
            emptyButtonText="最初のタスクを追加"
            addButtonText="タスクを追加"
            inputPlaceholder="タスクを入力"
            hintText="💡 ヒント: ここで設定したタスクは、この補助金で新規案件を作成する際に自動的に追加されます。案件ごとに後から追加・編集・削除が可能です。"
            hideHeaderAdd={true}
          />

          {/* Progress Stage Settings Card */}
          <div className="flex flex-col items-start p-4 lg:p-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-4 lg:mb-6">
              <div className="flex flex-col gap-2 flex-1">
                <h2 className="text-xl font-normal leading-7 tracking-[-0.44921875px] text-[#101828]">
                  進行段階設定
                </h2>
                <p className="text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#4A5565]">
                  顧客に表示される申請フローガイドのステップを設定します。顧客画面の進行度として表示されます。
                </p>
              </div>
              <button
                onClick={handleAddStep}
                className="flex flex-row items-center justify-center px-3 gap-2 h-9 bg-[#DBEAFE] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#1447E6] hover:bg-[#BFDBFE] transition-colors whitespace-nowrap"
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

            {/* Hint Box */}
            <HintBox>
              <p className="mb-1">
                💡 ヒント: これらのステップは顧客ワークスペースの「進行ガイド」に円形プログレスバーとして表示されます。
              </p>
              <ul className="list-disc list-inside ml-4 text-xs">
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

// Reusable Components
interface FormFieldProps {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FormField({ label, required, className, children }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className || 'w-full'}`}>
      <label className="text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#364153]">
        {label} {required && <span className="text-[#FB2C36]">*</span>}
      </label>
      {children}
    </div>
  );
}

interface DynamicListFieldProps {
  label: string;
  items: string[];
  newItem: string;
  setNewItem: (val: string) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  placeholder: string;
  addButtonText: string;
}

function DynamicListField({
  label,
  items,
  newItem,
  setNewItem,
  onAdd,
  onDelete,
  placeholder,
  addButtonText,
}: DynamicListFieldProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#364153]">
        {label}
      </label>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="form-input"
          aria-label={label}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAdd();
          }}
          className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA] hover:underline w-fit"
        >
          {addButtonText}
        </button>
        {items.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-row items-center gap-2">
                <span className="text-sm text-[#4A5565] flex-1">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(idx);
                  }}
                  className="text-[#FB2C36] hover:opacity-80"
                >
                  <DeleteIconAlt size={16} color="#FB2C36" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
  hintText?: string;
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
  const handleDelete = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  return (
    <div className="flex flex-col items-start p-4 lg:p-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
      <div className="flex flex-col gap-2 w-full mb-4 lg:mb-6">
        <h2 className="text-xl font-normal leading-7 tracking-[-0.44921875px] text-[#101828]">
          {title}
        </h2>
        <p className="text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#4A5565]">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {(sectionTitle || !hideHeaderAdd) && (
          <div className="flex flex-row justify-between items-center">
            {sectionTitle && (
              <h3 className="text-lg font-normal leading-7 tracking-[-0.439453125px] text-[#101828]">
                {sectionTitle}
              </h3>
            )}
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
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4 w-full min-h-[148px] bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DC] rounded-[14px]">
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
                <button onClick={() => handleDelete(idx)} className="p-2 text-[#FB2C36] hover:opacity-80">
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

function HintBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 p-[13px] w-full bg-[#EFF6FF] border border-[#BEDBFF] rounded-[10px] mt-4">
      <div className="text-sm font-normal leading-5 tracking-[-0.150390625px] text-[#193CB8]">
        {children}
      </div>
    </div>
  );
}
