import { ChangeEvent, useRef, useState } from 'react';
import Modal from './Modal';
import { PlusIcon, ChevronDownIcon, UploadIcon, DragHandleIcon, DeleteIconAlt} from '@/components/icons';
import { FormQuestion } from '../types';
import { generateId } from '../utils';
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';

// API用の型定義
type TaskType = 'file_upload' | 'form_input' | 'confirmation' | 'general';
type AssigneeRole = 'customer' | 'expert' | 'assistant';
type Priority = 'high' | 'medium' | 'low';

interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  assignee_role: AssigneeRole;
  assignee_id?: string;
  priority?: Priority;
  deadline?: string;
  is_required?: boolean;
  remind_at?: string;
  form_questions?: { question: string; is_required?: boolean; order?: number }[];
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: 'file' | 'form' | 'check';
  setTaskType: (type: 'file' | 'form' | 'check') => void;
  formQuestions: FormQuestion[];
  setFormQuestions: React.Dispatch<React.SetStateAction<FormQuestion[]>>;
  caseId?: string;
  onTaskCreated?: () => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  taskType,
  setTaskType,
  formQuestions,
  setFormQuestions,
  caseId,
  onTaskCreated,
}: TaskModalProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  // 担当者＝このタスクを「やる人」のロール。書類アップロード・フォーム入力は通常顧客が行うのでデフォルトは顧客
  const [handler, setHandler] = useState<AssigneeRole>('customer');
  const [item, setItem] = useState('必須選択');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームをリセット
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setHandler('customer');
    setItem('必須選択');
    setAttachedFiles([]);
    setError(null);
  };

  // モーダルを閉じる時
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // タスクを作成
  const handleCreateTask = async () => {
    if (!caseId) {
      setError('案件IDが見つかりません');
      return;
    }

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // タスクタイプをAPIの形式に変換
      const apiTaskType: TaskType = 
        taskType === 'file' ? 'file_upload' : 
        taskType === 'form' ? 'form_input' : 
        'confirmation';

      const requestBody: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: apiTaskType,
        assignee_role: handler,
        priority: priority,
        deadline: deadline || undefined,
        is_required: item === '必須選択',
      };

      // フォームタイプの場合は質問も含める
      if (taskType === 'form' && formQuestions.length > 0) {
        requestBody.form_questions = formQuestions
          .filter(q => q.question.trim())
          .map((q, index) => ({
            question: q.question.trim(),
            is_required: false,
            order: index + 1,
          }));
      }

      const response = await fetch(`/api/expert/cases/${caseId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'タスクの作成に失敗しました');
      }

      const { task } = await response.json();
      const taskId = task?.id;

      if (taskType === 'file' && taskId && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const validation = validateUploadFile(file);
          if (!validation.ok) {
            throw new Error(validation.error);
          }
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch(`/api/tasks/${taskId}/upload`, {
            method: 'POST',
            body: formData,
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || `ファイル「${file.name}」のアップロードに失敗しました`);
          }
        }
      }

      // 成功
      resetForm();
      onClose();
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    setFormQuestions([...formQuestions, { id: generateId(), question: '' }]);
  };

  const removeQuestion = (id: string) => {
    if (formQuestions.length > 1) {
      setFormQuestions(formQuestions.filter((q) => q.id !== id));
    }
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const list = Array.from(files);
    for (const file of list) {
      const validation = validateUploadFile(file);
      if (!validation.ok) {
        alert(validation.error);
        event.target.value = '';
        return;
      }
    }
    setAttachedFiles(list);
  };

  const handleFileDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleFileDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const file of list) {
      const validation = validateUploadFile(file);
      if (!validation.ok) {
        alert(validation.error);
        return;
      }
    }
    setAttachedFiles(list);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const updateQuestion = (id: string, value: string) => {
    setFormQuestions(
      formQuestions.map((q) => (q.id === id ? { ...q, question: value } : q))
    );
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newList = [...formQuestions];
    const [removed] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, removed);
    setFormQuestions(newList);
  };

  const handleQuestionDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuestionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleQuestionDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(fromIndex)) return;
    moveQuestion(fromIndex, toIndex);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新規タスク作成"
      subtitle="顧客に割り当てる新しいタスクを作成"
      maxWidth="max-w-[672px]"
      footer={
        <div className="flex flex-col lg:flex-row justify-end items-center gap-3 px-4 lg:px-6 py-4 lg:py-6 bg-[#F9FAFB]">
          {error && (
            <div className="w-full text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-2">
              {error}
            </div>
          )}
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2.5 w-full lg:w-auto border border-[#D1D5DC] rounded-[10px] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
          >
            <span className="text-sm lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#364153]">
              キャンセル
            </span>
          </button>
          <button
            onClick={handleCreateTask}
            disabled={isLoading || !title.trim()}
            className="flex items-center justify-center px-4 py-2.5 w-full lg:w-auto bg-[#9810FA] rounded-[10px] hover:bg-[#7A0DC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm lg:text-base font-normal leading-6 tracking-[-0.3125px] text-white">
              {isLoading ? '作成中...' : 'タスク作成'}
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 lg:gap-6 p-4 lg:p-6">
        {/* Task Type Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            タスクタイプ
          </label>
          <div className="flex flex-row gap-3">
            <button
              onClick={() => setTaskType('file')}
              className={`flex-1 py-2.5 px-4 rounded-[10px] border transition-colors ${
                taskType === 'file'
                  ? 'border-[#9810FA] bg-[#FAF5FF] text-[#9810FA]'
                  : 'border-[#D1D5DC] bg-white text-[#364153]'
              }`}
            >
              書類アップロード
            </button>
            <button
              onClick={() => setTaskType('form')}
              className={`flex-1 py-2.5 px-4 rounded-[10px] border transition-colors ${
                taskType === 'form'
                  ? 'border-[#9810FA] bg-[#FAF5FF] text-[#9810FA]'
                  : 'border-[#D1D5DC] bg-white text-[#364153]'
              }`}
            >
              フォーム作成
            </button>
            <button
              onClick={() => setTaskType('check')}
              className={`flex-1 py-2.5 px-4 rounded-[10px] border transition-colors ${
                taskType === 'check'
                  ? 'border-[#9810FA] bg-[#FAF5FF] text-[#9810FA]'
                  : 'border-[#D1D5DC] bg-white text-[#364153]'
              }`}
            >
              確認のみ
            </button>
          </div>
          {taskType === 'check' && (
            <p className="text-xs text-[#6A7282] mt-1">
              ファイルやフォームなしで、完了ボタンを押すだけで終わるタスクです。
            </p>
          )}
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            タイトル <span className="text-[#FB2C36]">*</span>
          </label>
          <input
            type="text"
            placeholder="タスク名を入力"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 placeholder:text-[#99A1AF] focus:outline-none focus:border-[#9810FA]"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            説明
          </label>
          <textarea
            placeholder="タスクの詳細説明を入力"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 placeholder:text-[#99A1AF] resize-none focus:outline-none focus:border-[#9810FA]"
          />
        </div>

        {/* File Upload Section (for file type) */}
        {taskType === 'file' && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              ファイルアップロード
            </label>
            <button
              type="button"
              onClick={triggerFileSelect}
              onDragOver={handleFileDragOver}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center gap-1.5 px-4 py-6 w-full min-h-[140px] border border-[#E5E7EB] rounded-[20px] bg-white shadow-sm hover:border-[#C5B4FF] transition-colors"
            >
              <UploadIcon size={32} color="#9CA3AF" />
              <span className="text-base font-normal leading-5 text-[#1F2937]">
                クリックしてファイルを選択
              </span>
              <span className="text-xs font-normal leading-4 text-[#9CA3AF]">
                またはここにファイルをドラッグ＆ドロップ
              </span>
              <span className="text-xs font-normal leading-4 text-[#9CA3AF]">
                PDF, Word, Excel, ZIP (最大10MB)
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={getAcceptAttribute()}
              onChange={handleFilesChange}
            />
            {attachedFiles.length > 0 && (
              <div className="flex flex-col gap-1">
                {attachedFiles.map((file) => (
                  <span
                    key={file.name + file.lastModified}
                    className="px-3 py-2 rounded-[10px] bg-[#F3F4F6] text-sm text-[#364153]"
                  >
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form Questions Section (for form type) */}
        {taskType === 'form' && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
            </label>
            <div className="flex flex-col gap-3">
              {formQuestions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex flex-col gap-3 px-4 py-3 border border-[#E5E7EB] rounded-[10px] bg-[#F9FAFB]"
                  onDragOver={handleQuestionDragOver}
                  onDrop={(e) => handleQuestionDrop(e, index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="cursor-move touch-none select-none flex items-center justify-center p-1 -m-1 rounded hover:bg-[#E5E7EB]/50"
                          draggable
                          onDragStart={(e) => handleQuestionDragStart(e, index)}
                          title="ドラッグで順序を変更"
                        >
                          <DragHandleIcon size={16} color="#99A1AF" />
                        </div>
                        <span className="text-xs text-[#4A5565]">質問</span>
                      </div>
                      <div className="flex items-start gap-3 pb-2">
                        <span className="text-base text-[#4A5565] pt-0.5">#{index + 1}</span>
                        <textarea
                          placeholder="質問の詳細な説明を入力"
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, e.target.value)}
                          rows={2}
                          className="flex-1 px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:border-[#9810FA] resize-none bg-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="p-2 rounded-full hover:bg-[#FFECEE] transition-colors self-start"
                      disabled={formQuestions.length <= 1}
                    >
                      <DeleteIconAlt
                        size={18}
                        color={formQuestions.length <= 1 ? '#D1D5DC' : '#FB2C36'}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addQuestion}
              className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm font-medium text-[#364153] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
            >
              <PlusIcon size={16} color="#364153" />
            </button>
          </div>
        )}

        {/* Priority, Deadline, Handler, and Item */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              期限
            </label>
            <input
              type="date"
              placeholder="年・月・日"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 focus:outline-none focus:border-[#9810FA]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              優先順位
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full appearance-none px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 text-[#101828] focus:outline-none focus:border-[#9810FA]"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <ChevronDownIcon
                size={20}
                color="#4A5565"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              担当者タイプ（このタスクを行う人）
            </label>
            <div className="relative">
              <select
                value={handler}
                onChange={(e) => setHandler(e.target.value as AssigneeRole)}
                className="w-full appearance-none px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 text-[#101828] focus:outline-none focus:border-[#9810FA]"
              >
                <option value="customer">顧客</option>
                <option value="expert">行政書士</option>
                <option value="assistant">アシスタント</option>
              </select>
              <ChevronDownIcon
                size={20}
                color="#4A5565"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
              項目
            </label>
            <div className="relative">
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full appearance-none px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-base leading-5 text-[#101828] focus:outline-none focus:border-[#9810FA]"
              >
                <option value="必須選択">必須選択</option>
                <option value="任意">任意</option>
                <option value="未設定">未設定</option>
              </select>
              <ChevronDownIcon
                size={20}
                color="#4A5565"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
