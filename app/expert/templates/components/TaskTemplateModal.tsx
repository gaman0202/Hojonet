'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon, ChevronDownIcon, DragHandleIcon, UploadIcon, DeleteIconAlt, RefreshIcon } from '@/components/icons';
import { taskFilterCategories, taskCategoryBadges, priorityBadges, roleLabels } from '../data';
import { TaskCategory, Priority, Role } from '../types';
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';

interface Question {
  id: string;
  content: string;
}

interface TaskTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: TaskCategory;
    type: 'file' | 'form';
    content: string;
    file?: File;
    questions?: Question[];
    deadline: string;
    priority: Priority;
    assignee: Role;
    item: string;
    reminder: boolean;
  }, templateId?: string) => Promise<void> | void;
  initialTemplate?: import('../types').TaskTemplate | null;
}

const deadlineOptions = [
  { value: '7', label: '登録から7日' },
  { value: '14', label: '登録から14日' },
  { value: '30', label: '登録から30日' },
  { value: '60', label: '登録から60日' },
];

const priorityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const assigneeOptions = [
  { value: 'administrative-scrivener', label: '行政書士' },
  { value: 'assistant', label: 'アシスタント' },
];

const itemOptions = [
  { value: 'required', label: '必須選択' },
  { value: 'optional', label: '任意選択' },
];

export default function TaskTemplateModal({ isOpen, onClose, onSubmit, initialTemplate }: TaskTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('hearing');
  const [type, setType] = useState<'file' | 'form'>('file');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', content: '' },
    { id: '2', content: '' },
    { id: '3', content: '' },
  ]);
  const [deadline, setDeadline] = useState('7');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState<Role>('administrative-scrivener');
  const [item, setItem] = useState('required');
  const [reminder, setReminder] = useState(true);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setTemplateName(initialTemplate.title);
      setCategory(initialTemplate.category);
      setContent(initialTemplate.description);
      setPriority(initialTemplate.priority);
      setAssignee(initialTemplate.role);
    } else if (isOpen) {
      setTemplateName('');
      setCategory('hearing');
      setContent('');
      setPriority('medium');
      setAssignee('administrative-scrivener');
    }
  }, [isOpen, initialTemplate]);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isItemOpen, setIsItemOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (
          isCategoryOpen ||
          isDeadlineOpen ||
          isPriorityOpen ||
          isAssigneeOpen ||
          isItemOpen
        ) {
          setIsCategoryOpen(false);
          setIsDeadlineOpen(false);
          setIsPriorityOpen(false);
          setIsAssigneeOpen(false);
          setIsItemOpen(false);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isCategoryOpen, isDeadlineOpen, isPriorityOpen, isAssigneeOpen, isItemOpen]);

  // 드롭다운 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (deadlineRef.current && !deadlineRef.current.contains(event.target as Node)) {
        setIsDeadlineOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setIsPriorityOpen(false);
      }
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setIsAssigneeOpen(false);
      }
      if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
        setIsItemOpen(false);
      }
    };

    if (
      isCategoryOpen ||
      isDeadlineOpen ||
      isPriorityOpen ||
      isAssigneeOpen ||
      isItemOpen
    ) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen, isDeadlineOpen, isPriorityOpen, isAssigneeOpen, isItemOpen]);

  const handleClose = useCallback(() => {
    setTemplateName('');
    setCategory('hearing');
    setType('file');
    setContent('');
    setFile(null);
    setQuestions([{ id: '1', content: '' }, { id: '2', content: '' }, { id: '3', content: '' }]);
    setDeadline('7');
    setPriority('medium');
    setAssignee('administrative-scrivener');
    setItem('required');
    setReminder(true);
    setIsCategoryOpen(false);
    setIsDeadlineOpen(false);
    setIsPriorityOpen(false);
    setIsAssigneeOpen(false);
    setIsItemOpen(false);
    onClose();
  }, [onClose]);

  const handleSubmit = async () => {
    if (!templateName || !category || !content) {
      return;
    }

    const fileToSubmit = file ?? undefined;
    await onSubmit({
      name: templateName,
      category,
      type,
      content,
      ...(type === 'file' && fileToSubmit ? { file: fileToSubmit } : {}),
      ...(type === 'form' ? { questions: questions.filter((q) => q.content.trim() !== '') } : {}),
      deadline,
      priority,
      assignee,
      item,
      reminder,
    }, initialTemplate?.id);
    handleClose();
  };

  const handleAddQuestion = () => {
    const newId = String(questions.length + 1);
    setQuestions([...questions, { id: newId, content: '' }]);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id: string, content: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, content } : q)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const validation = validateUploadFile(selectedFile);
    if (!validation.ok) {
      alert(validation.error);
      e.target.value = '';
      return;
    }
    setFile(selectedFile);
  };

  const selectedCategory = taskFilterCategories.find((cat) => cat.value === category);
  const selectedDeadline = deadlineOptions.find((opt) => opt.value === deadline);
  const selectedPriority = priorityOptions.find((opt) => opt.value === priority);
  const selectedAssignee = assigneeOptions.find((opt) => opt.value === assignee);
  const selectedItem = itemOptions.find((opt) => opt.value === item);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col items-start w-full max-w-[768px] max-h-[90vh] bg-white rounded-[10px] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-start w-full border-b border-[#E5E7EB] flex-shrink-0">
          <div className="px-6 pt-6 pb-4 w-full">
            <h2 className="text-xl font-normal leading-7 tracking-[-0.449219px] text-[#101828] mb-4">
              {initialTemplate ? 'テンプレート編集' : '新規テンプレート登録'}
            </h2>
            <div className="px-3 py-1.5 bg-[#DCFCE7] border border-[#B9F8CF] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#008236] inline-block">
              タスクテンプレート
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-6 pt-6 pb-6 gap-4 w-full overflow-y-auto flex-1">
          {/* Template Name */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              テンプレート名
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例: 初回ヒアリング依頼メッセージ"
              className="w-full h-[42px] px-4 py-2 text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              カテゴリー
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <div className="relative w-full" ref={categoryRef}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full h-[39px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`text-base font-normal leading-5 tracking-[-0.3125px] ${
                    selectedCategory ? 'text-[#101828]' : 'text-[rgba(10,10,10,0.5)]'
                  }`}
                >
                  {selectedCategory ? selectedCategory.label : 'カテゴリーを選択'}
                </span>
                <ChevronDownIcon
                  size={20}
                  color="#4A5565"
                  className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isCategoryOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                  {taskFilterCategories
                    .filter((cat) => cat.value !== 'all')
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value as TaskCategory);
                          setIsCategoryOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {cat.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              タイプ
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <div className="flex flex-row items-center gap-4">
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="file"
                  checked={type === 'file'}
                  onChange={(e) => setType(e.target.value as 'file' | 'form')}
                  className="w-4 h-4 text-[#1369FF] focus:ring-[#1369FF]"
                />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  ファイル
                </span>
              </label>
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="form"
                  checked={type === 'form'}
                  onChange={(e) => setType(e.target.value as 'file' | 'form')}
                  className="w-4 h-4 text-[#1369FF] focus:ring-[#1369FF]"
                />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  フォーム
                </span>
              </label>
            </div>
          </div>

          {/* Task Content */}
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              タスク内容
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[122px] px-4 py-3 text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
              placeholder="タスクの詳細な内容を入力してください"
            />
          </div>

          {/* File Upload (only when type is 'file') */}
          {type === 'file' && (
            <div className="flex flex-col items-start gap-2 w-full">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                ファイルアップロード
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[132px] px-0 py-6 flex flex-col items-center justify-center gap-2.5 bg-white border border-[#D1D5DC] rounded-[10px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptAttribute()}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadIcon size={32} color={file ?? initialTemplate?.fileName ? '#9810FA' : '#99A1AF'} />
                <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-center text-[#4A5565]">
                  {file
                    ? file.name
                    : initialTemplate?.fileName
                      ? initialTemplate.fileName
                      : 'クリックしてファイルを選択'}
                </p>
                {(file ?? initialTemplate?.fileName) ? (
                  <p className="text-xs font-normal leading-4 text-center text-[#9810FA]">
                    {file ? '新しいファイルが選択されています' : '添付済み・クリックで変更'}
                  </p>
                ) : (
                  <p className="text-xs font-normal leading-4 text-center text-[#6A7282]">
                    PDF, Word, Excel, ZIP (最大10MB)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Questions (only when type is 'form') */}
          {type === 'form' && (
            <div className="flex flex-col items-start gap-4 w-full">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="w-full p-[17px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px]"
                >
                  <div className="flex flex-row items-start gap-3">
                    {/* Drag Handle & Number */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <DragHandleIcon size={20} color="#99A1AF" />
                      </div>
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Question Input */}
                    <div className="flex flex-col gap-3 flex-1">
                      <label className="text-xs font-normal leading-4 text-[#4A5565]">質問</label>
                      <textarea
                        value={question.content}
                        onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                        className="w-full h-[58px] px-3 py-2 text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] placeholder:text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
                        placeholder="質問の詳細な説明を入力"
                      />
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-2 rounded-[10px] hover:bg-gray-100 transition-colors flex-shrink-0"
                      aria-label="削除"
                    >
                      <DeleteIconAlt size={20} color="#FB2C36" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full h-9 px-3 flex flex-row items-center justify-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] hover:bg-gray-50 transition-colors"
              >
                <PlusIcon size={16} color="#364153" />
              </button>
            </div>
          )}

          {/* Deadline & Priority (Side by side) */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-4 w-full">
            {/* Deadline */}
            <div className="flex flex-col items-start gap-2 flex-1 w-full sm:w-auto" ref={deadlineRef}>
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                期限設定
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsDeadlineOpen(!isDeadlineOpen)}
                  className="w-full h-[44px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                    {selectedDeadline?.label || '選択してください'}
                  </span>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className={`transition-transform ${isDeadlineOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isDeadlineOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                    {deadlineOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setDeadline(opt.value);
                          setIsDeadlineOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="flex flex-col items-start gap-2 flex-1 w-full sm:w-auto" ref={priorityRef}>
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                優先順位
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  className="w-full h-[44px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828]">
                    {selectedPriority?.label || '選択してください'}
                  </span>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className={`transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isPriorityOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                    {priorityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPriority(opt.value as Priority);
                          setIsPriorityOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assignee & Item (Side by side) */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-4 w-full">
            {/* Assignee */}
            <div className="flex flex-col items-start gap-2 flex-1 w-full sm:w-auto" ref={assigneeRef}>
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                担当者
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                  className="w-full h-[44px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                    {selectedAssignee?.label || '選択してください'}
                  </span>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className={`transition-transform ${isAssigneeOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isAssigneeOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                    {assigneeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAssignee(opt.value as Role);
                          setIsAssigneeOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Item */}
            <div className="flex flex-col items-start gap-2 flex-1 w-full sm:w-auto" ref={itemRef}>
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                項目
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsItemOpen(!isItemOpen)}
                  className="w-full h-[44px] px-3 py-2 flex flex-row justify-between items-center bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                    {selectedItem?.label || '選択してください'}
                  </span>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className={`transition-transform ${isItemOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isItemOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                    {itemOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setItem(opt.value);
                          setIsItemOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] hover:bg-gray-50 transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Task Reminder Notification */}
          <div className="flex flex-col items-start gap-1.5 w-full">
            <label className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
              タスクリマインド通知
              <span className="text-[#FB2C36] ml-1">*</span>
            </label>
            <div className="flex flex-row items-center gap-4">
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reminder"
                  checked={reminder}
                  onChange={() => setReminder(true)}
                  className="w-4 h-4 text-[#1369FF] focus:ring-[#1369FF]"
                />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  On
                </span>
              </label>
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reminder"
                  checked={!reminder}
                  onChange={() => setReminder(false)}
                  className="w-4 h-4 text-[#1369FF] focus:ring-[#1369FF]"
                />
                <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
                  Off
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-row justify-end items-center px-6 py-5 gap-3 w-full border-t border-[#E5E7EB] flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center px-6 py-3 h-[46px] bg-white border border-[#D1D5DC] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153] hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!templateName || !category || !content}
            className="flex flex-row items-center px-6 gap-2 h-[46px] bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <span>{initialTemplate ? '更新' : '登録'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
