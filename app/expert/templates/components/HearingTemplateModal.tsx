'use client';

import { useState, useEffect } from 'react';
import { XIcon, PlusIcon, TrashIcon, ChevronDownIcon } from '@/components/icons';
import { HearingQuestion, HearingQuestionType, HearingTemplate } from '../types';

interface HearingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    subsidyType: string;
    questions: HearingQuestion[];
  }, templateId?: string) => Promise<void>;
  initialTemplate?: HearingTemplate | null;
}

const QUESTION_TYPES: { value: HearingQuestionType; label: string }[] = [
  { value: 'text', label: 'テキスト入力' },
  { value: 'textarea', label: '長文入力' },
  { value: 'number', label: '数値入力' },
  { value: 'select', label: 'ドロップダウン' },
  { value: 'radio', label: 'ラジオボタン' },
  { value: 'checkbox', label: 'チェックボックス' },
];

const SUBSIDY_TYPES = [
  '事業再構築補助金',
  'ものづくり補助金',
  '小規模事業者持続化補助金',
  'IT導入補助金',
  'その他',
];

export default function HearingTemplateModal({ isOpen, onClose, onSubmit, initialTemplate }: HearingTemplateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subsidyType, setSubsidyType] = useState('');
  const [questions, setQuestions] = useState<HearingQuestion[]>([
    { id: 'q1', question: '', type: 'text', required: true, options: [] },
  ]);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setTitle(initialTemplate.title);
      setDescription(initialTemplate.description);
      setSubsidyType(initialTemplate.subsidyType);
      setQuestions(
        initialTemplate.questions.length > 0
          ? initialTemplate.questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }))
          : [{ id: 'q1', question: '', type: 'text', required: true, options: [] }]
      );
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setSubsidyType('');
      setQuestions([{ id: 'q1', question: '', type: 'text', required: true, options: [] }]);
    }
  }, [isOpen, initialTemplate]);

  const addQuestion = () => {
    const newId = `q${questions.length + 1}`;
    setQuestions([...questions, { id: newId, question: '', type: 'text', required: true, options: [] }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof HearingQuestion, value: string | boolean | string[]) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[questionIndex].options || [];
    updated[questionIndex].options = [...currentOptions, ''];
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options || [])];
    options[optionIndex] = value;
    updated[questionIndex].options = options;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options?.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          title,
          description,
          subsidyType,
          questions: questions.filter((q) => q.question.trim() !== ''),
        },
        initialTemplate?.id
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsOptions = (type: HearingQuestionType) => ['select', 'radio', 'checkbox'].includes(type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div
        className="flex flex-col w-full max-w-[700px] max-h-[90vh] bg-white rounded-2xl shadow-xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-row justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-xl font-medium text-[#101828]">{initialTemplate ? 'ヒアリングテンプレート編集' : 'ヒアリングテンプレート作成'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} color="#4A5565" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Template Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#364153]">テンプレート名 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 事業再構築補助金ヒアリングフォーム"
              className="w-full h-11 px-4 border border-[#D1D5DC] rounded-[10px] text-base text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#364153]">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このヒアリングフォームの目的を説明してください"
              rows={2}
              className="w-full px-4 py-3 border border-[#D1D5DC] rounded-[10px] text-base text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#9810FA] resize-none"
            />
          </div>

          {/* Subsidy Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#364153]">補助金種類</label>
            <div className="relative">
              <select
                value={subsidyType}
                onChange={(e) => setSubsidyType(e.target.value)}
                className="w-full h-11 px-4 pr-10 border border-[#D1D5DC] rounded-[10px] text-base text-[#101828] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
              >
                <option value="">選択してください</option>
                {SUBSIDY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={20} color="#4A5565" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-row justify-between items-center">
              <label className="text-sm font-medium text-[#364153]">質問項目</label>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 text-sm text-[#9810FA] hover:underline"
              >
                <PlusIcon size={16} color="#9810FA" />
                質問を追加
              </button>
            </div>

            {questions.map((q, index) => (
              <div key={q.id} className="flex flex-col gap-3 p-4 bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB]">
                <div className="flex flex-row justify-between items-center">
                  <span className="text-sm font-medium text-[#4A5565]">質問 {index + 1}</span>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(index)}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                    >
                      <TrashIcon size={16} color="#DC2626" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                  placeholder="質問内容を入力"
                  className="w-full h-10 px-3 border border-[#D1D5DC] rounded-lg text-sm text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
                />

                <div className="flex flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-[#6A7282] mb-1 block">回答タイプ</label>
                    <div className="relative">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value as HearingQuestionType)}
                        className="w-full h-9 px-3 pr-8 border border-[#D1D5DC] rounded-lg text-sm text-[#101828] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
                      >
                        {QUESTION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon size={16} color="#4A5565" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 h-9">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                        className="w-4 h-4 rounded border-[#D1D5DC]"
                      />
                      <span className="text-sm text-[#364153]">必須</span>
                    </label>
                  </div>
                </div>

                {/* Options for select/radio/checkbox */}
                {needsOptions(q.type) && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs text-[#6A7282]">選択肢</label>
                    {(q.options || []).map((option, optIndex) => (
                      <div key={optIndex} className="flex flex-row gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, optIndex, e.target.value)}
                          placeholder={`選択肢 ${optIndex + 1}`}
                          className="flex-1 h-9 px-3 border border-[#D1D5DC] rounded-lg text-sm text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
                        />
                        <button
                          onClick={() => removeOption(index, optIndex)}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon size={14} color="#DC2626" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(index)}
                      className="text-xs text-[#9810FA] hover:underline self-start"
                    >
                      + 選択肢を追加
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-row justify-end items-center gap-3 px-6 py-5 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center px-6 py-2 h-10 border border-[#D1D5DC] rounded-[10px] text-[#364153] hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || questions.every((q) => !q.question.trim())}
            className="flex items-center justify-center px-6 py-2 h-10 bg-[#9810FA] rounded-[10px] text-white hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '保存中...' : initialTemplate ? '更新する' : '登録する'}
          </button>
        </div>
      </div>
    </div>
  );
}
