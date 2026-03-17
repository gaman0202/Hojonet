'use client';

import { useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon } from '@/components/icons';
import { HearingFormData, HearingQuestion } from '../types';

interface HearingTabProps {
  hearingData: HearingFormData | null;
  onSubmit: (responses: Record<string, string | string[]>) => void;
  onSaveDraft: (responses: Record<string, string | string[]>) => void;
}

export default function HearingTab({ hearingData, onSubmit, onSaveDraft }: HearingTabProps) {
  const [responses, setResponses] = useState<Record<string, string | string[]>>(hearingData?.responses || {});
  const [isSaving, setIsSaving] = useState(false);

  if (!hearingData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 bg-[#F3F4F6] rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="#6A7282" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#101828] mb-2">ヒアリングフォームがありません</h3>
        <p className="text-sm text-[#6A7282]">担当者からヒアリングフォームが届くとこちらに表示されます</p>
      </div>
    );
  }

  const isSubmitted = hearingData.status === 'submitted' || hearingData.status === 'reviewed';

  const handleChange = (questionId: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const current = (responses[questionId] as string[]) || [];
    const updated = checked ? [...current, option] : current.filter((v) => v !== option);
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSubmit(responses);
    setIsSaving(false);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await onSaveDraft(responses);
    setIsSaving(false);
  };

  const getProgress = () => {
    const requiredQuestions = hearingData.questions.filter((q) => q.required);
    const answeredRequired = requiredQuestions.filter((q) => {
      const answer = responses[q.id];
      if (Array.isArray(answer)) return answer.length > 0;
      return answer && answer.trim() !== '';
    });
    return Math.round((answeredRequired.length / requiredQuestions.length) * 100);
  };

  const progress = getProgress();

  const renderQuestion = (question: HearingQuestion, index: number) => {
    const value = responses[question.id] || (question.type === 'checkbox' ? [] : '');

    return (
      <div key={question.id} className="flex flex-col gap-2 p-4 bg-white border-l-4 border-[#9810FA] rounded-lg shadow-sm">
        <div className="flex items-start gap-2">
          <span className="text-sm font-medium text-[#9810FA]">Q{index + 1}</span>
          <div className="flex-1">
            <label className="text-sm font-medium text-[#101828]">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        </div>

        <div className="mt-2">
          {question.type === 'text' && (
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleChange(question.id, e.target.value)}
              disabled={isSubmitted}
              className="w-full h-10 px-3 border border-[#D1D5DC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9810FA] disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"
              placeholder="回答を入力してください"
            />
          )}

          {question.type === 'textarea' && (
            <textarea
              value={value as string}
              onChange={(e) => handleChange(question.id, e.target.value)}
              disabled={isSubmitted}
              rows={3}
              className="w-full px-3 py-2 border border-[#D1D5DC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9810FA] resize-none disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"
              placeholder="回答を入力してください"
            />
          )}

          {question.type === 'number' && (
            <input
              type="number"
              value={value as string}
              onChange={(e) => handleChange(question.id, e.target.value)}
              disabled={isSubmitted}
              className="w-full h-10 px-3 border border-[#D1D5DC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9810FA] disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"
              placeholder="数値を入力してください"
            />
          )}

          {question.type === 'select' && (
            <div className="relative">
              <select
                value={value as string}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={isSubmitted}
                className="w-full h-10 px-3 pr-10 border border-[#D1D5DC] rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#9810FA] disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"
              >
                <option value="">選択してください</option>
                {question.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={16} color="#6A7282" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {question.type === 'radio' && (
            <div className="flex flex-col gap-2">
              {question.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    disabled={isSubmitted}
                    className="w-4 h-4 text-[#9810FA] focus:ring-[#9810FA] disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-[#364153]">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'checkbox' && (
            <div className="flex flex-col gap-2">
              {question.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(value as string[]).includes(option)}
                    onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                    disabled={isSubmitted}
                    className="w-4 h-4 rounded border-[#D1D5DC] text-[#9810FA] focus:ring-[#9810FA] disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-[#364153]">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 bg-[#F9FAFB] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-medium text-[#101828]">{hearingData.templateTitle}</h3>
            <p className="text-sm text-[#6A7282]">
              {isSubmitted ? '提出済み' : '以下の質問に回答してください'}
            </p>
          </div>
          {isSubmitted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#DCFCE7] rounded-full">
              <CheckCircleIcon size={16} color="#00A63E" />
              <span className="text-sm font-medium text-[#00A63E]">提出完了</span>
            </div>
          )}
        </div>

        {!isSubmitted && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6A7282]">入力進捗</span>
              <span className="text-[#9810FA] font-medium">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9810FA] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4">
        {hearingData.questions.map((question, index) => renderQuestion(question, index))}
      </div>

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex flex-row items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-6 py-2 h-10 border border-[#D1D5DC] rounded-lg text-[#364153] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            一時保存
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || progress < 100}
            className="px-6 py-2 h-10 bg-[#9810FA] rounded-lg text-white hover:bg-[#7A0DC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '送信中...' : '提出する'}
          </button>
        </div>
      )}

      {/* 提出完了メッセージ（下側に表示） */}
      {isSubmitted && hearingData.submittedAt && (
        <div className="mt-4 p-4 rounded-[10px] bg-[#DCFCE7] border border-[#B9F8CF] flex flex-row items-center gap-3">
          <CheckCircleIcon size={24} color="#008236" className="flex-shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[#008236]">提出が完了しました</span>
            <span className="text-xs text-[#4A5565]">
              提出日時: {new Date(hearingData.submittedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      )}

      {/* 専門家確認済み（確認済みの場合） */}
      {hearingData.status === 'reviewed' && hearingData.reviewedAt && (
        <div className="mt-4 p-4 rounded-[10px] bg-[#DCFCE7] border border-[#B9F8CF] flex flex-row items-center gap-3">
          <CheckCircleIcon size={24} color="#008236" className="flex-shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[#008236]">専門家が確認済みです</span>
            <span className="text-xs text-[#4A5565]">
              確認日時: {new Date(hearingData.reviewedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
