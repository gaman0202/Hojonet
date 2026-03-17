// app/expert/management/[id]/[caseId]/page.tsx

'use client';

import { useState, use, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ExpertSidebar from '@/components/layout/ExpertSidebar';
import {
  ArrowLeftIcon,
  CheckIcon,
  SendIcon,
  PaperclipIcon,
  DocumentIcon,
  ClockIcon,
  XIcon,
  PlusIcon,
  UserIcon,
  ChevronDownIcon,
  DownloadIcon,
  ChatBubbleIcon,
  ClipboardIcon,
  InfoIcon,
  RefreshIcon,
  UploadIcon,
} from '@/components/icons';

// Types
import { FormQuestion, Tab, TabId, Task, CustomerInfo, TimelineItem, ProgressStep, TaskTemplate } from './types';

// Data
import {
  progressSteps,
  customerInfo as defaultCustomerInfo,
} from './data';

// Utils
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';
import {
  getPriorityBadge,
  generateId,
  mapApiTaskToTask,
} from './utils';

// Components
import {
  Modal,
  TimelineTab,
  HistoryModal,
  TaskModal,
  ContractModal,
  TemplateModal,
  DocumentTemplateModal,
  HearingResponseViewer,
} from './components';

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = use(params);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailMode, setTaskDetailMode] = useState<'view' | 'edit'>('view');
  const [taskEditForm, setTaskEditForm] = useState<{ title: string; description: string; priority: 'high' | 'medium' | 'low'; deadline: string }>({ title: '', description: '', priority: 'medium', deadline: '' });
  const [taskEditFormQuestions, setTaskEditFormQuestions] = useState<FormQuestion[]>([]);
  const [taskEditSaving, setTaskEditSaving] = useState(false);
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [taskAttachments, setTaskAttachments] = useState<{ id: number | string; file_name: string; file_size: number; uploaded_by_me: boolean; source?: string }[]>([]);
  const [taskAttachmentsLoading, setTaskAttachmentsLoading] = useState(false);
  /** フォームタスクの質問・顧客回答（詳細ビュー用） */
  const [taskFormViewData, setTaskFormViewData] = useState<{ questions: { id: number; question_text: string }[]; answers: Record<number, string> } | null>(null);
  const [taskFormViewLoading, setTaskFormViewLoading] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHearingViewerOpen, setIsHearingViewerOpen] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<{ id: string; title: string; content: string }[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<{ id: string; title: string; description?: string }[]>([]);
  const [, setTemplatesLoading] = useState(false);
  const [isDocTemplateModalOpen, setIsDocTemplateModalOpen] = useState(false);
  const [isMessageTemplateOpen, setIsMessageTemplateOpen] = useState(false);
  const messageTemplateDropdownRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // タイムライン（APIから取得）
  const [caseActivities, setCaseActivities] = useState<TimelineItem[]>([]);
  const [caseActivitiesLoading, setCaseActivitiesLoading] = useState(false);

  // ヒアリング回答（APIから取得）
  const [hearingResponse, setHearingResponse] = useState<{
    id: string;
    templateTitle: string;
    customerName: string;
    status: 'pending' | 'submitted' | 'reviewed';
    questions: { id: string; question: string; type: string; required: boolean; options?: string[] }[];
    responses: Record<string, string | string[]>;
    submittedAt?: string;
  } | null>(null);
  const [hearingLoading, setHearingLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<number, '進行前' | '進行中' | '完了'>>({});
  const [taskType, setTaskType] = useState<'file' | 'form' | 'check'>('file');
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([
    { id: generateId(), question: '' },
    { id: generateId(), question: '' },
    { id: generateId(), question: '' },
  ]);
  // selectedDocument removed - documents tab now uses dbDocs state
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const statusFilterOptions = [
    { value: 'all', label: '全ステータス' },
    { value: 'pending', label: '未着手' },
    { value: 'in-progress', label: '進行中' },
    { value: 'completed', label: '完了' },
  ];
  const typeFilterOptions = [
    { value: 'all', label: '全タイプ' },
    { value: 'task', label: 'タスク' },
    { value: 'document', label: '書類' },
    { value: 'review', label: '検討' },
  ];
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(statusFilterOptions[0].value);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(typeFilterOptions[0].value);

  // 顧客情報（APIから取得、未取得時は読み込み中表示）
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(defaultCustomerInfo);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(true);
  // 顧客詳細への戻り先ID（/expert/customers/[id] 用）
  const [customerIdForBack, setCustomerIdForBack] = useState<string | null>(null);
  const [caseHeaderTitle, setCaseHeaderTitle] = useState('');
  const [caseHeaderAmount, setCaseHeaderAmount] = useState('');
  /** 案件情報（APIの caseInfo。未取得時はフォールバック用のデフォルト値） */
  const [caseInfoFromApi, setCaseInfoFromApi] = useState<{
    deadline: string;
    progress: number;
    amount: string;
    region: string;
    createdDate: string;
    lastModified: string;
  } | null>(null);
  const [caseRejectLoading, setCaseRejectLoading] = useState(false);
  const [jGrantsSubmitting, setJGrantsSubmitting] = useState(false);
  const [jGrantsResult, setJGrantsResult] = useState<string | null>(null);
  /** 案件ステータス（accepted = 契約完了のため却下・契約進行ボタンを非表示） */
  const [caseStatus, setCaseStatus] = useState<string>('');
  const router = useRouter();
  /** 進行段階（API取得。未取得時は data の progressSteps を使用） */
  const [progressStepsFromApi, setProgressStepsFromApi] = useState<ProgressStep[] | null>(null);

  // メッセージ（APIから取得。顧客・専門家のやり取り）
  type CaseMessage = {
    id: number;
    sender_name: string;
    sender_initial: string;
    is_expert: boolean;
    content: string;
    created_at: string;
    attachments?: { id: number; file_name: string; file_path: string; file_size: string | null }[];
  };
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>([]);
  const [caseMessagesLoading, setCaseMessagesLoading] = useState(false);
  const [caseMessagesSending, setCaseMessagesSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [messageAttachment, setMessageAttachment] = useState<File | null>(null);
  const [messagePreviewUrl, setMessagePreviewUrl] = useState<string | null>(null);
  const messageFileInputRef = useRef<HTMLInputElement>(null);
  /** 顧客がこの案件チャットにいるか（Presence）。null=未取得 */
  const [customerOnline, setCustomerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (messageAttachment?.type.startsWith('image/')) {
      const url = URL.createObjectURL(messageAttachment);
      setMessagePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setMessagePreviewUrl(null);
      };
    }
    setMessagePreviewUrl(null);
  }, [messageAttachment]);

  type DbDoc = {
    id: number;
    case_id: number;
    title: string;
    document_type: string | null;
    file_name: string | null;
    file_path: string | null;
    file_size: string | null;
    status: 'not_submitted' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
    is_required: boolean;
    has_template: boolean;
    template_url: string | null;
    feedback: string | null;
    uploaded_at: string | null;
    expert_comment: string | null;
    category: string | null;
    is_expert_shared: boolean;
    // 顧客がアップロード/提出した新規書類に対するNEWフラグ
    is_new?: boolean;
  };
  const [dbDocs, setDbDocs] = useState<DbDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [, setReviewingDocId] = useState<number | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [addDocModalOpen, setAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(false);
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [addDocSaving, setAddDocSaving] = useState(false);
  const addDocFileInputRef = useRef<HTMLInputElement>(null);

  /** 書類のダウンロードは明示的なボタンクリック時のみ実行（カードクリックなどで誤発火しないようリンクではなくボタンで開く） */
  const handleDocumentDownloadClick = useCallback(
    (docId: number) => {
      const url = `/api/cases/${caseId}/documents/${docId}/download`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [caseId]
  );

  const handleAddDocDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleAddDocDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    setAddDocFile(file);
  };

  const handleTaskFileUpload = async (taskId: number, file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tasks/${taskId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'ファイルのアップロードに失敗しました');
        return;
      }
      if (!selectedTask || selectedTask.id !== taskId) return;
      // 再度添付一覧を取得して反映
      const cancelled = false;
      setTaskAttachmentsLoading(true);
      setTaskAttachments([]);
      fetch(`/api/tasks/${taskId}/attachments`)
        .then((res) => (res.ok ? res.json() : { attachments: [] }))
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data.attachments) ? data.attachments : [];
          setTaskAttachments(
            list.map(
              (a: {
                id: number | string;
                file_name: string;
                file_size: number;
                uploaded_by_me?: boolean;
                source?: string;
              }) => ({
                id: a.id,
                file_name: a.file_name,
                file_size: a.file_size ?? 0,
                uploaded_by_me: !!a.uploaded_by_me,
                source: a.source,
              })
            )
          );
        })
        .catch(() => {
          if (!cancelled) setTaskAttachments([]);
        })
        .finally(() => {
          if (!cancelled) setTaskAttachmentsLoading(false);
        });
    } catch (e) {
      console.error('Task file upload error', e);
      alert('ファイルのアップロードに失敗しました');
    }
  };

  const handleTaskFileDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleTaskFileDrop = (taskId: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void handleTaskFileUpload(taskId, file);
  };

  // タスク一覧（APIから取得）
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!caseId) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await fetch(`/api/expert/cases/${caseId}/tasks`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'タスクの取得に失敗しました');
      }
      const data = await res.json();
      const list = (data.tasks ?? []).map(mapApiTaskToTask);
      setTasks(list);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [caseId]);

  // タスクカードクリック時に詳細を開きつつ NEW フラグを既読にする
  const handleExpertTaskCardClick = async (task: Task) => {
    setSelectedTask(task);
    if (!task.is_new) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_new: false } : t)));
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_new: false }),
      });
    } catch (e) {
      console.error('Failed to clear expert task NEW flag:', e);
    }
  };

  const fetchDocs = useCallback(async () => {
    if (!caseId) return;
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDbDocs(data.documents ?? []);
      }
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setDocsLoading(false);
    }
  }, [caseId]);

  // silent: true のときはローディング表示せず、差分があるときだけ state 更新（リラン防止）
  const fetchCaseMessages = useCallback(async (silent = false) => {
    if (!caseId) return;
    if (!silent) setCaseMessagesLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const next = Array.isArray(data.messages) ? data.messages : [];
        setCaseMessages((prev) => {
          if (prev.length === next.length && prev[prev.length - 1]?.id === next[next.length - 1]?.id) return prev;
          return next;
        });
      } else {
        if (!silent) setCaseMessages([]);
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
      if (!silent) setCaseMessages([]);
    } finally {
      if (!silent) setCaseMessagesLoading(false);
    }
  }, [caseId]);

  const handleSendMessage = useCallback(async () => {
    const text = messageInput.trim();
    if ((!text && !messageAttachment) || !caseId || caseMessagesSending) return;
    if (messageAttachment) {
      const validation = validateUploadFile(messageAttachment);
      if (!validation.ok) {
        alert(validation.error);
        return;
      }
    }
    setCaseMessagesSending(true);
    try {
      let res: Response;
      if (messageAttachment) {
        const formData = new FormData();
        formData.append('content', text);
        formData.append('file', messageAttachment);
        res = await fetch(`/api/cases/${caseId}/messages`, { method: 'POST', body: formData });
      } else {
        res = await fetch(`/api/cases/${caseId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
      }
      if (res.ok) {
        setMessageInput('');
        setMessageAttachment(null);
        if (messageFileInputRef.current) messageFileInputRef.current.value = '';
        await fetchCaseMessages();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '送信に失敗しました');
      }
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setCaseMessagesSending(false);
    }
  }, [caseId, messageInput, messageAttachment, caseMessagesSending, fetchCaseMessages]);

  const fetchCaseSteps = useCallback(async () => {
    if (!caseId) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/steps`);
      if (res.ok) {
        const data = await res.json();
        const stepsList = data.steps ?? [];
        const next: Record<number, '進行前' | '進行中' | '完了'> = {};
        stepsList.forEach((s: { step_order: number; status: string }) => {
          const order = s.step_order;
          next[order] = s.status === 'completed' ? '完了' : s.status === 'in_progress' ? '進行中' : '進行前';
        });
        setStepStatuses(next);
      }
    } catch (e) {
      console.error('Error fetching case steps:', e);
    }
  }, [caseId]);

  const updateStepStatus = useCallback(
    async (stepOrder: number, statusJa: '進行前' | '進行中' | '完了') => {
      const status = statusJa === '完了' ? 'completed' : statusJa === '進行中' ? 'in_progress' : 'pending';
      
      try {
        if (statusJa === '進行中') {
          setStepStatuses((prev) => {
            const otherInProgressSteps: number[] = [];
            Object.keys(prev).forEach((key) => {
              const order = Number(key);
              if (order !== stepOrder && prev[order] === '進行中') {
                otherInProgressSteps.push(order);
              }
            });
            otherInProgressSteps.forEach((order) => {
              fetch(`/api/cases/${caseId}/steps`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_order: order, status: 'pending' }),
              }).catch((e) => console.error('Error updating other step status:', e));
            });
            const updated: Record<number, '進行前' | '進行中' | '完了'> = { ...prev };
            Object.keys(updated).forEach((key) => {
              const order = Number(key);
              if (order !== stepOrder && updated[order] === '進行中') {
                updated[order] = '進行前';
              }
            });
            updated[stepOrder] = statusJa;
            return updated;
          });
        }
        const res = await fetch(`/api/cases/${caseId}/steps`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step_order: stepOrder, status }),
        });
        if (res.ok) {
          if (statusJa !== '進行中') {
            setStepStatuses((prev) => ({ ...prev, [stepOrder]: statusJa }));
          }
        }
      } catch (e) {
        console.error('Error updating step status:', e);
        await fetchCaseSteps();
      }
    },
    [caseId, fetchCaseSteps]
  );

  const handleDocStatusChange = useCallback(async (docId: number, status: string, feedback?: string) => {
    try {
      const body: Record<string, unknown> = { status };
      // 承認・却下どちらでもコメントがあれば保存（却下はfeedback、承認はexpert_comment）
      if (feedback !== undefined && feedback.trim()) {
        if (status === 'rejected') {
          body.feedback = feedback;
        } else if (status === 'approved') {
          body.expert_comment = feedback;
        }
      }
      const res = await fetch(`/api/cases/${caseId}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`エラー: ${err.error || res.statusText}`);
        return;
      }
      await fetchDocs();
      setReviewComment('');
      setReviewingDocId(null);
    } catch (e) {
      console.error('Status change error:', e);
    }
  }, [caseId, fetchDocs]);

  /** 書類追加モーダルでの送信: ファイルあり→専門家アップロード、なし→書類エントリ作成 */
  const handleAddDocumentSubmit = useCallback(async () => {
    if (!newDocTitle.trim() && !addDocFile) return;
    if (addDocFile) {
      const validation = validateUploadFile(addDocFile);
      if (!validation.ok) {
        alert(validation.error);
        return;
      }
    }
    setAddDocSaving(true);
    try {
      if (addDocFile) {
        const formData = new FormData();
        formData.append('file', addDocFile);
        formData.append('title', newDocTitle.trim() || addDocFile.name);
        const res = await fetch(`/api/cases/${caseId}/documents/expert-upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`アップロードに失敗しました: ${err.error || res.statusText}`);
          return;
        }
      } else {
        const res = await fetch(`/api/cases/${caseId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newDocTitle.trim(), is_required: newDocRequired }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`エラー: ${err.error || res.statusText}`);
          return;
        }
      }
      setAddDocModalOpen(false);
      setNewDocTitle('');
      setNewDocRequired(false);
      setAddDocFile(null);
      await fetchDocs();
    } catch (e) {
      console.error('Add document error:', e);
      alert('処理に失敗しました');
    } finally {
      setAddDocSaving(false);
    }
  }, [caseId, newDocTitle, newDocRequired, addDocFile, fetchDocs]);

  // Reserved for future delete-document UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- will be wired when delete UI is added
  const handleDeleteDocument = useCallback(async (docId: number) => {
    if (!confirm('この書類を削除しますか？')) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`エラー: ${err.error || res.statusText}`);
        return;
      }
      await fetchDocs();
    } catch (e) {
      console.error('Delete document error:', e);
    }
  }, [caseId, fetchDocs]);

  useEffect(() => {
    fetchTasks();
    fetchDocs();
  }, [fetchTasks, fetchDocs]);

  // 書類タブでリスト取得後、選択がなければ先頭を選択
  useEffect(() => {
    if (activeTab !== 'documents' || dbDocs.length === 0) return;
    if (selectedDocId === null || !dbDocs.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(dbDocs[0].id);
    }
  }, [activeTab, dbDocs, selectedDocId]);

  useEffect(() => {
    if (caseId) fetchCaseSteps();
  }, [caseId, fetchCaseSteps]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/expert/templates');
      if (res.ok) {
        const data = await res.json();
        const apiTasks = (data.taskTemplates ?? []) as { id: string; category: string; title: string; description: string; priority: 'high' | 'medium' | 'low'; role: string; fileName?: string; fileUrl?: string }[];
        const priorityMap = { high: '高', medium: '中', low: '低' } as const;
        const priorityColorMap = {
          high: { bg: '#FFE2E2', text: '#C10007' },
          medium: { bg: '#FEF9C2', text: '#A65F00' },
          low: { bg: '#DBEAFE', text: '#1447E6' },
        } as const;
        const categoryLabelMap: Record<string, string> = {
          hearing: 'ヒアリング',
          document: '書類',
          meeting: '打合せ',
          confirmation: '確認',
          application: '申請',
          report: '報告',
          preparation: '準備',
        };
        const mapped: TaskTemplate[] = apiTasks.map((t) => ({
          id: t.id,
          title: t.title ?? '',
          description: t.description ?? '',
          priority: priorityMap[t.priority] ?? '中',
          priorityColor: priorityColorMap[t.priority] ?? priorityColorMap.medium,
          assignee: t.role === 'assistant' ? 'アシスタント' : '行政書士',
          category: categoryLabelMap[t.category] ?? t.category,
          fileName: t.fileName,
          fileUrl: t.fileUrl,
        }));
        setTaskTemplates(mapped);
        const msgs = (data.messageTemplates ?? []) as { id: string; title: string; content: string }[];
        setMessageTemplates(msgs.map((m) => ({ id: m.id, title: m.title ?? '', content: m.content ?? '' })));
        const docs = (data.documentTemplates ?? []) as { id: string; title: string; description?: string }[];
        setDocumentTemplates(docs.map((d) => ({ id: d.id, title: d.title ?? '', description: d.description ?? '' })));
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (caseId) fetchCaseSteps();
  }, [caseId, fetchCaseSteps]);

  useEffect(() => {
    if (isMessagePanelOpen && caseId) fetchCaseMessages();
  }, [isMessagePanelOpen, caseId, fetchCaseMessages]);

  useEffect(() => {
    if (!isMessagePanelOpen || !caseId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${caseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `case_id=eq.${caseId}` },
        () => { fetchCaseMessages(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isMessagePanelOpen, caseId, fetchCaseMessages]);

  // Presence: 顧客がこの案件チャットにいるか（オンライン表示用）
  useEffect(() => {
    if (!isMessagePanelOpen || !caseId) {
      setCustomerOnline(null);
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(`presence:case-${caseId}`);
    const updateOnline = () => {
      const state = channel.presenceState();
      const presences = (Object.values(state) as { user_id?: string; role?: string }[][]).flat();
      const hasCustomer = presences.some((p) => p.role === 'customer');
      setCustomerOnline(hasCustomer);
    };
    channel
      .on('presence', { event: 'sync' }, updateOnline)
      .on('presence', { event: 'join' }, updateOnline)
      .on('presence', { event: 'leave' }, updateOnline)
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await channel.track({ user_id: session.user.id, role: 'expert' });
        }
      });
    return () => {
      supabase.removeChannel(channel);
      setCustomerOnline(null);
    };
  }, [isMessagePanelOpen, caseId]);

  useEffect(() => {
    if (!isMessagePanelOpen || !caseId) return;
    const interval = setInterval(() => fetchCaseMessages(true), 4000);
    return () => clearInterval(interval);
  }, [isMessagePanelOpen, caseId, fetchCaseMessages]);

  // メッセージは常に最新（一番下）が表示されるようスクロール位置を下へ
  useEffect(() => {
    if (!isMessagePanelOpen) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    scrollToBottom();
    const t = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(t);
  }, [isMessagePanelOpen, caseMessages, caseMessagesLoading]);

  // モバイル: メッセージモーダル開時は背面が一切スクロール되지 않도록 html/body を完全ロック
  useEffect(() => {
    if (!isMessagePanelOpen) return;
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1279px)') : null;
    if (!mq?.matches) return;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyLeft = document.body.style.left;
    const prevBodyRight = document.body.style.right;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.left = prevBodyLeft;
      document.body.style.right = prevBodyRight;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isMessagePanelOpen]);

  const fetchCaseActivity = useCallback(async () => {
    if (!caseId) return;
    setCaseActivitiesLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setCaseActivities(data.activities ?? []);
      } else {
        setCaseActivities([]);
      }
    } catch (e) {
      console.error('Error fetching activity:', e);
      setCaseActivities([]);
    } finally {
      setCaseActivitiesLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (activeTab === 'timeline' && caseId) fetchCaseActivity();
  }, [activeTab, caseId, fetchCaseActivity]);

  const fetchHearing = useCallback(() => {
    if (!caseId) return;
    setHearingLoading(true);
    fetch(`/api/expert/cases/${caseId}/hearing`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('取得に失敗しました。'))))
      .then((data) => {
        setHearingResponse({
          ...data,
          submittedAt: data.submittedAt ?? undefined,
          status: data.reviewedAt ? 'reviewed' : data.status,
        });
      })
      .catch(() => setHearingResponse(null))
      .finally(() => setHearingLoading(false));
  }, [caseId]);

  useEffect(() => {
    if (caseId) fetchHearing();
  }, [caseId, fetchHearing]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskAttachments([]);
      return;
    }
    let cancelled = false;
    setTaskAttachmentsLoading(true);
    setTaskAttachments([]);
    fetch(`/api/tasks/${selectedTask.id}/attachments`)
      .then((res) => (res.ok ? res.json() : { attachments: [] }))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.attachments) ? data.attachments : [];
        setTaskAttachments(list.map((a: { id: number | string; file_name: string; file_size: number; uploaded_by_me?: boolean; source?: string }) => ({
          id: a.id,
          file_name: a.file_name,
          file_size: a.file_size ?? 0,
          uploaded_by_me: !!a.uploaded_by_me,
          source: a.source,
        })));
      })
      .catch(() => { if (!cancelled) setTaskAttachments([]); })
      .finally(() => { if (!cancelled) setTaskAttachmentsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTask?.id, selectedTask]);

  useEffect(() => {
    if (!selectedTask || selectedTask.type !== 'form_input') {
      setTaskFormViewData(null);
      return;
    }
    let cancelled = false;
    setTaskFormViewLoading(true);
    setTaskFormViewData(null);
    fetch(`/api/tasks/${selectedTask.id}/form`)
      .then((res) => (res.ok ? res.json() : { questions: [], answers: {} }))
      .then((data) => {
        if (cancelled) return;
        setTaskFormViewData({
          questions: data.questions ?? [],
          answers: data.answers ?? {},
        });
      })
      .catch(() => { if (!cancelled) setTaskFormViewData(null); })
      .finally(() => { if (!cancelled) setTaskFormViewLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTask?.id, selectedTask?.type, selectedTask]);

  // 案件の顧客情報を取得
  useEffect(() => {
    if (!caseId) {
      setCustomerInfoLoading(false);
      return;
    }
    let cancelled = false;
    setCustomerInfoLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/expert/cases/${caseId}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const c = json.customer;
        if (!cancelled) {
          if (json.case?.status != null) setCaseStatus(String(json.case.status));
          if (json.subsidyTitle != null) setCaseHeaderTitle(String(json.subsidyTitle));
          if (json.subsidyAmount != null) setCaseHeaderAmount(String(json.subsidyAmount));
          if (json.caseInfo != null) setCaseInfoFromApi(json.caseInfo);
          if (json.case?.user_group_id) {
            setCustomerIdForBack(String(json.case.user_group_id));
          }
          if (c) {
            setCustomerInfo({
              name: c.name?.trim() ?? '',
              email: c.email?.trim() ?? '',
              company: c.company?.trim() ?? '',
              contact: c.contact?.trim() ?? '',
              industry: c.industry?.trim() ?? '',
              region: c.region?.trim() ?? '',
            });
          }
          setCustomerInfoLoading(false);
        }
      } catch {
        if (!cancelled) setCustomerInfoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  // ページに入ったらメッセージを既読にする
  useEffect(() => {
    if (!caseId) return;
    (async () => {
      try {
        await fetch(`/api/cases/${caseId}/messages/read`, {
          method: 'POST',
        });
      } catch (error) {
        // エラーは無視（既読処理の失敗は致命的ではない）
        console.error('Failed to mark messages as read:', error);
      }
    })();
  }, [caseId]);

  // 進行段階を API から取得
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/steps`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const steps = (json.steps as { id: number; step_order: number; title: string; subtitle: string | null; status: string }[] | undefined) ?? [];
        if (cancelled) return;
        // id に step_order を使う（updateStepStatus が step_order で PATCH するため）
        const mapped: ProgressStep[] = steps.map((s) => ({
          id: s.step_order,
          title: s.title ?? '',
          subtitle: (s.subtitle ?? '') as string,
          status: (s.status === 'completed' ? 'completed' : s.status === 'in_progress' ? 'in-progress' : 'pending') as 'completed' | 'in-progress' | 'pending',
          statusText: s.status === 'completed' ? '完了' : s.status === 'in_progress' ? '進行中' : '進行前',
        }));
        setProgressStepsFromApi(mapped);
        setStepStatuses((prev) => ({
          ...prev,
          ...Object.fromEntries(
            mapped.map((s) => [s.id, (s.status === 'completed' ? '完了' : s.status === 'in-progress' ? '進行中' : '進行前') as '進行前' | '進行中' | '完了'])
          ),
        }));
      } catch {
        // 失敗時はデフォルトのまま
      }
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  const updateDropdownPosition = useCallback(() => {
    if (openDropdownId !== null && buttonRefs.current[openDropdownId]) {
      const button = buttonRefs.current[openDropdownId];
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
  }, [openDropdownId]);

  // Update dropdown position when opened
  useEffect(() => {
    if (openDropdownId !== null) {
      updateDropdownPosition();
    } else {
      setDropdownPosition(null);
    }
  }, [openDropdownId, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (openDropdownId !== null) {
        const button = buttonRefs.current[openDropdownId];
        if (button && button.contains(target)) {
          return;
        }
        // Check if click is inside any dropdown menu
        const dropdownElement = (event.target as HTMLElement)?.closest('[data-dropdown-menu]');
        if (dropdownElement) {
          return;
        }
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId]);

  useEffect(() => {
    if (openDropdownId === null) {
      return;
    }
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [openDropdownId, updateDropdownPosition]);

  // Close message template dropdown when clicking outside
  useEffect(() => {
    if (!isMessageTemplateOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (messageTemplateDropdownRef.current?.contains(target)) return;
      setIsMessageTemplateOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMessageTemplateOpen]);

  const tabs: Tab[] = [
    { id: 'info', label: '情報', icon: InfoIcon },
    { id: 'tasks', label: 'タスク', icon: ClipboardIcon },
    { id: 'documents', label: '書類', icon: DocumentIcon },
    { id: 'timeline', label: 'タイムライン', icon: RefreshIcon },
  ];

  const caseInfo = caseInfoFromApi ?? {
    deadline: '—',
    progress: 0,
    amount: '—',
    region: '—',
    createdDate: '—',
    lastModified: '—',
  };

  const handleCaseReject = useCallback(async () => {
    if (!caseId || caseRejectLoading) return;
    if (!window.confirm('この案件を却下しますか？')) return;
    setCaseRejectLoading(true);
    try {
      const res = await fetch(`/api/expert/cases/${caseId}/reject`, { method: 'PATCH' });
      const data = res.ok ? await res.json().catch(() => ({})) : { error: '失敗しました。' };
      if (!res.ok) {
        alert((data as { error?: string }).error || '却下に失敗しました');
        return;
      }
      router.push(`/expert/management/${id}`);
    } catch {
      alert('却下に失敗しました');
    } finally {
      setCaseRejectLoading(false);
    }
  }, [caseId, id, caseRejectLoading, router]);

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };
  /** 契約書類タスクが承認済みの場合は契約完了とみなし、却下・契約進行ボタンを非表示 */
  const hasApprovedContractTask = tasks.some(
    (t) => t.title === '契約書類' && (t.rawStatus === 'approved' || t.status === 'completed')
  );
  const showCaseActionButtons = caseStatus !== 'accepted' && !hasApprovedContractTask;

  const displayProgressSteps = progressStepsFromApi ?? progressSteps;
  const stepWidthPercent = 100 / displayProgressSteps.length;

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <ExpertSidebar activeItem="management" />

      {/* Main Content Area - 全体ページでスクロール */}
      <div className="flex flex-col lg:flex-row w-full min-w-0 lg:ml-[255px] min-h-screen overflow-x-hidden">
        {/* Left Content - expands when message panel is closed */}
        <div
          className={`flex flex-col items-start w-full min-w-0 transition-all overflow-x-hidden ${
            isMessagePanelOpen ? 'xl:flex-[3]' : 'xl:flex-1'
          }`}
        >
          {/* Header Section */}
          <div className="flex flex-col items-start pl-4 lg:pl-6 pr-4 lg:pr-4 pt-4 lg:pt-6 pb-4 lg:pb-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
            <div className="flex flex-row items-center gap-3 flex-wrap">
              <Link
                href={`/expert/management/${id}`}
                className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <ArrowLeftIcon size={20} color="#4A5565" />
                <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                  案件リスト
                </span>
              </Link>
              {customerIdForBack && (
                <Link
                  href={`/expert/customers/${encodeURIComponent(customerIdForBack)}`}
                  className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <UserIcon size={20} color="#4A5565" />
                  <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                    顧客情報
                  </span>
                </Link>
              )}
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4 w-full min-w-0">
              <div className="flex flex-col gap-2 flex-1 min-w-0 w-full" style={{ flexShrink: 0 }}>
                <h1 className="text-[22px] lg:text-2xl font-normal leading-7 lg:leading-8 tracking-[0.395508px] text-[#101828] whitespace-nowrap overflow-hidden text-ellipsis">
                  {caseHeaderTitle || '案件'}
                </h1>
                {caseHeaderAmount ? (
                  <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                    {caseHeaderAmount}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-row items-center justify-end gap-2 lg:gap-3 w-full lg:w-auto min-w-0" style={{ flexShrink: 10 }}>
                {showCaseActionButtons && (
                  <>
                    <button
                      onClick={handleCaseReject}
                      disabled={caseRejectLoading}
                      className="flex items-center justify-center px-3 lg:px-3 xl:px-4 2xl:px-5 py-2.5 lg:py-3 bg-[#FB2C36] rounded-[10px] hover:bg-[#E01E28] transition-colors flex-shrink min-w-[2ch] disabled:opacity-50"
                    >
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-white whitespace-nowrap truncate">
                        {caseRejectLoading ? '処理中...' : '却下'}
                      </span>
                    </button>
                    <button
                      onClick={() => setIsContractModalOpen(true)}
                      className="flex items-center justify-center px-3 lg:px-3 xl:px-4 2xl:px-5 py-2.5 lg:py-3 bg-[#00C950] rounded-[10px] hover:bg-[#00B045] transition-colors flex-shrink min-w-[2ch]"
                    >
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-white whitespace-nowrap truncate">
                        契約進行
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="flex flex-row items-center w-full bg-white border-b border-[#E5E7EB]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-row items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-6 py-3 lg:py-4 h-[48px] lg:h-[54px] border-b-2 transition-colors flex-1 ${
                    isActive
                      ? 'border-[#9810FA] text-[#9810FA]'
                      : 'border-transparent text-[#4A5565] hover:text-[#101828]'
                  }`}
                >
                  <Icon size={18} color={isActive ? '#9810FA' : '#4A5565'} className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                  <span className="text-[14px] lg:text-sm font-normal leading-4 lg:leading-5 tracking-[-0.150391px] whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Section - 全体ページスクロールのため内部スクロールなし */}
          <div className={`flex flex-col items-start p-4 lg:p-6 gap-6 w-full bg-[#F9FAFB] overflow-x-hidden ${isMessagePanelOpen ? 'max-xl:overflow-hidden max-xl:touch-none' : ''}`}>
            {/* Info Tab Content */}
            {activeTab === 'info' && (
              <>
                {/* Progress Steps Section */}
                <div className="flex flex-col items-start gap-3 lg:gap-4 w-full">
                  <h2 className="text-[16px] lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                    進行段階
                  </h2>
                  <div className="flex flex-col items-start p-4 lg:p-6 gap-4 lg:gap-6 w-full max-w-full bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                    <div className="relative w-full overflow-x-auto max-w-full">
                    {/* Progress Line */}
                    <div className="absolute top-4 lg:top-5 left-0 right-0 h-0.5 min-w-[600px] lg:min-w-0">
                      {displayProgressSteps.map((step, index) => {
                        const currentStepStatus = stepStatuses[step.id] ?? step.statusText ?? '進行前';
                        
                        // 선의 색상 결정 (완료된 단계만 보라색)
                        const connectorColor =
                          currentStepStatus === '完了' ? '#AD46FF' : '#E5E7EB';
                        
                        const stepCenter = (index + 0.5) * stepWidthPercent;
                        const prevStepCenter =
                          index > 0 ? (index - 0.5) * stepWidthPercent : stepCenter;
                        const nextStepCenter =
                          index < displayProgressSteps.length - 1 ? (index + 1.5) * stepWidthPercent : stepCenter;

                        // 선의 위치와 너비 계산
                        let lineLeft: number;
                        let lineRight: number;

                        if (index === 0) {
                          lineLeft = 0;
                          lineRight = (stepCenter + nextStepCenter) / 2;
                        } else if (index === displayProgressSteps.length - 1) {
                          lineLeft = (prevStepCenter + stepCenter) / 2;
                          lineRight = 100;
                        } else {
                          lineLeft = (prevStepCenter + stepCenter) / 2;
                          lineRight = (stepCenter + nextStepCenter) / 2;
                        }

                        const lineWidth = lineRight - lineLeft;
                        
                        return (
                          <div
                            key={`line-${step.id}`}
                            className="absolute h-full"
                            style={{
                              left: `${lineLeft}%`,
                              width: `${lineWidth}%`,
                              backgroundColor: connectorColor,
                            }}
                          />
                        );
                      })}
                    </div>
                    {/* Steps */}
                    <div className="relative flex flex-row justify-between min-w-[600px] lg:min-w-0">
                      {displayProgressSteps.map((step) => {
                        const currentStepStatus = stepStatuses[step.id] || '進行前';
                        const getStatusBg = (status: '進行前' | '進行中' | '完了') => {
                          switch (status) {
                            case '完了':
                              return '#00C950';
                            case '進行中':
                              return '#AD46FF';
                            case '進行前':
                              return '#99A1AF';
                            default:
                              return '#99A1AF';
                          }
                        };
                        const statusBg = getStatusBg(currentStepStatus);
                        // 이전 step이 완료되지 않았으면 드롭다운 비활성화
                        // const prevStepStatus = index > 0 ? (stepStatuses[progressSteps[index - 1].id] || '進行前') : null;
                        // const isDropdownDisabled = index > 0 && prevStepStatus !== '完了';
                        const isDropdownDisabled = false;
                        
                        return (
                          <div
                            key={step.id}
                            className="flex flex-col items-center gap-1.5 lg:gap-2 relative"
                            style={{ width: `${100 / displayProgressSteps.length}%` }}
                          >
                            <div
                              className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full shadow-sm"
                              style={{ backgroundColor: statusBg }}
                            >
                              {currentStepStatus === '完了' ? (
                                <CheckIcon size={20} color="#FFFFFF" className="w-5 h-5 lg:w-6 lg:h-6" />
                              ) : currentStepStatus === '進行中' ? (
                                <div className="flex flex-row gap-0.5 lg:gap-1">
                                  <div className="w-0.5 h-0.5 lg:w-1 lg:h-1 bg-white rounded-full opacity-84" />
                                  <div className="w-0.5 h-0.5 lg:w-1 lg:h-1 bg-white rounded-full opacity-96" />
                                  <div className="w-0.5 h-0.5 lg:w-1 lg:h-1 bg-white rounded-full opacity-100" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-white rounded-full" />
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-0.5 lg:gap-1">
                              <span className="text-[10px] lg:text-xs font-normal leading-3 lg:leading-4 text-center text-[#101828]">
                                {step.title}
                              </span>
                              <span className="text-[9px] lg:text-[10px] font-normal leading-[12px] lg:leading-[15px] text-center text-[#6A7282]">
                                {step.subtitle}
                              </span>
                            </div>
                            {/* Status Dropdown Trigger */}
                            <div className="relative">
                              <button
                                ref={(el) => {
                                  buttonRefs.current[step.id] = el;
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDropdownDisabled) {
                                    setOpenDropdownId(openDropdownId === step.id ? null : step.id);
                                  }
                                }}
                                disabled={isDropdownDisabled}
                                className={`flex items-center justify-center px-2 lg:px-2.5 py-0.5 rounded text-[9px] lg:text-[10px] font-normal leading-[12px] lg:leading-[15px] text-white transition-colors ${
                                  isDropdownDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                style={{ backgroundColor: statusBg }}
                              >
                                {currentStepStatus}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

                {/* Customer Information Section */}
                <div className="flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                  <h2 className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                    顧客情報
                  </h2>
                  {customerInfoLoading ? (
                    <p className="text-sm text-[#6A7282]">読み込み中...</p>
                  ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:gap-x-6 w-full">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">名前</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.name || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">会社名</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.company || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">メール</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.email || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">連絡先</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.contact || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">業種</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.industry || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">地域</span>
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{customerInfo.region || '—'}</span>
                    </div>
                  </div>
                  )}
                </div>

                {/* Hearing Response Section */}
                <div className="flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                  <div className="flex flex-row justify-between items-center w-full">
                    <h2 className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                      ヒアリング回答
                    </h2>
                    {hearingLoading && (
                      <span className="text-xs text-[#6A7282]">読み込み中...</span>
                    )}
                    {!hearingLoading && hearingResponse != null && hearingResponse.status === 'submitted' && (
                      <span className="px-2 py-1 bg-[#DBEAFE] text-[#1E40AF] text-xs rounded-full">回答済み</span>
                    )}
                    {!hearingLoading && hearingResponse != null && hearingResponse.status === 'pending' && (
                      <span className="px-2 py-1 bg-[#F3F4F6] text-[#6A7282] text-xs rounded-full">未回答</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-sm text-[#6A7282]">
                      {hearingResponse != null ? hearingResponse.templateTitle : 'ヒアリングフォーム'}
                    </p>
                    <div className="flex flex-row gap-3">
                      <button
                        onClick={() => { if (hearingResponse != null) setIsHearingViewerOpen(true); }}
                        disabled={hearingResponse == null}
                        className="flex items-center gap-2 px-4 py-2 bg-[#9810FA] text-white rounded-lg hover:bg-[#7A0DC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <DocumentIcon size={16} color="#FFFFFF" />
                        <span className="text-sm">回答を確認</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Case Information Section */}
                <div className="flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                  <h2 className="text-[16px] lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                    案件情報
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:gap-x-6 w-full">
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">締切日</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.deadline}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">進行率</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.progress}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">支援金額</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.amount}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">地域</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.region}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">生成日</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.createdDate}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] lg:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">最終修正</span>
                      <span className="text-[18px] lg:text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{caseInfo.lastModified}</span>
                    </div>
                  </div>
                </div>
                {/* jGrants申請 */}  
                  <div className="flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                    <h2 className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828]">
                      jGrants申請
                    </h2>
                    <p className="text-sm text-[#6A7282]">
                      ヒアリング回答データをもとに、jGrantsへ自動申請します。
                    </p>
                      <button
                        onClick={async () => {
                          setJGrantsSubmitting(true);
                          setJGrantsResult(null);
                          try {
                            const res = await fetch('https://n8n.srv1284240.hstgr.cloud/webhook/48117fc2-d0ee-4194-a21e-c83df1fb5b6c', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ case_id: parseInt(caseId) }),
                            });
                            setJGrantsResult(res.ok ? 'success' : 'error');
                          } catch {
                            setJGrantsResult('error');
                          } finally {
                            setJGrantsSubmitting(false);
                          }
                        }}
                        disabled={jGrantsSubmitting}
                        className="flex flex-row items-center gap-2 px-4 py-2 bg-[#00A63E] text-white rounded-[10px] hover:bg-[#008236] transition-colors disabled:opacity-50"
                      >
                        {jGrantsSubmitting ? '申請中...' : 'jGrantsに申請'}
                      </button>
                      {jGrantsResult === 'success' && (
                        <p className="text-sm text-[#008236]">✅ 申請を開始しました。完了までしばらくお待ちください。</p>
                      )}
                      {jGrantsResult === 'error' && (
                        <p className="text-sm text-[#C10007]">❌ 申請に失敗しました。再度お試しください。</p>
                      )}
                    </div>
              </>
            )}

            {/* Tasks Tab Content */}
            {activeTab === 'tasks' && (
              <>
                {tasksError && (
                  <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-700">
                    {tasksError}
                  </div>
                )}
                {/* Task Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 w-full">
                  <div className="flex flex-col items-start p-4 gap-1 bg-white border border-[#E5E7EB] rounded-[10px]">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">総タスク</span>
                    <span className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#101828]">{taskStats.total}</span>
                  </div>
                  <div className="flex flex-col items-start p-4 gap-1 bg-white border border-[#E5E7EB] rounded-[10px]">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">未着手</span>
                    <span className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#101828]">{taskStats.pending}</span>
                  </div>
                  <div className="flex flex-col items-start p-4 gap-1 bg-white border border-[#E5E7EB] rounded-[10px]">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">進行中</span>
                    <span className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#9810FA]">{taskStats.inProgress}</span>
                  </div>
                  <div className="flex flex-col items-start p-4 gap-1 bg-white border border-[#E5E7EB] rounded-[10px]">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#6A7282]">完了</span>
                    <span className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#00A63E]">{taskStats.completed}</span>
                  </div>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 p-4 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
                  <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full lg:w-auto">
                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="w-full appearance-none border border-[#D1D5DC] bg-white px-3 pr-10 py-2 rounded-[10px] text-sm font-normal leading-5 tracking-[-0.3125px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                      >
                        {statusFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        size={16}
                        color="#4A5565"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                    <div className="relative w-full lg:w-auto">
                      <select
                        value={selectedTypeFilter}
                        onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        className="w-full appearance-none border border-[#D1D5DC] bg-white px-3 pr-10 py-2 rounded-[10px] text-sm font-normal leading-5 tracking-[-0.3125px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                      >
                        {typeFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        size={16}
                        color="#4A5565"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2 w-full lg:w-auto flex-wrap">
                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 border-2 border-[#DAB2FF] rounded-[10px] hover:bg-[#FAF5FF] transition-colors flex-1 lg:flex-none"
                    >
                      <DocumentIcon size={16} color="#9810FA" />
                      <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#9810FA]">テンプレート</span>
                    </button>
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 bg-[#9810FA] rounded-[10px] hover:bg-[#7A0DC8] transition-colors flex-1 lg:flex-none"
                    >
                      <PlusIcon size={16} color="#FFFFFF" />
                      <span className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-white">タスク追加</span>
                    </button>
                  </div>
                </div>

                {/* Kanban Board */}
                <div className="flex flex-col lg:flex-row gap-3 w-full overflow-x-auto">
                  {tasksLoading ? (
                    <div className="flex flex-1 items-center justify-center py-12 text-[#6A7282]">
                      タスクを読み込み中...
                    </div>
                  ) : (
                    <>
                  {/* Pending Column */}
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[280px]">
                    <div className="flex flex-row justify-between items-center p-3 w-full bg-[#F3F4F6] rounded-t-[10px]">
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">未着手</span>
                      <span className="flex items-center justify-center px-2 py-1 bg-[#E5E7EB] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">{taskStats.pending}</span>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {tasks.filter((t) => t.status === 'pending').map((task) => {
                        const priorityBadge = getPriorityBadge(task.priority);
                        return (
                          <div
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleExpertTaskCardClick(task)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExpertTaskCardClick(task)}
                            className="flex flex-col gap-3 p-4 bg-white border border-[#E5E7EB] rounded-[10px] cursor-pointer hover:border-[#9810FA] hover:shadow-sm transition-colors"
                          >
                            <div className="flex flex-row justify-between items-start gap-2">
                              <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                                <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] truncate">{task.title}</span>
                                {task.is_new && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6] flex-shrink-0">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center justify-center px-2 py-1 rounded text-xs font-normal leading-4 flex-shrink-0" style={{ backgroundColor: priorityBadge.bg, border: `1px solid ${priorityBadge.border}`, color: priorityBadge.text }}>{priorityBadge.label}</span>
                            </div>
                            <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.description}</p>
                            <div className="flex flex-row items-center gap-2">
                              <UserIcon size={16} color="#99A1AF" />
                              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.assignee}</span>
                            </div>
                            <div className="flex flex-row items-center gap-2">
                              <ClockIcon size={16} color="#99A1AF" />
                              <span className={`text-sm font-normal leading-5 tracking-[-0.150391px] ${task.daysLeft > 0 ? 'text-[#F54900]' : task.daysLeft < 0 ? 'text-[#C10007]' : 'text-[#4A5565]'}`}>
                                {task.dueDate
                                  ? task.daysLeft > 0
                                    ? `残り ${task.daysLeft}日`
                                    : task.daysLeft === 0
                                      ? '今日が期限'
                                      : `${task.dueDate} (${Math.abs(task.daysLeft)}日超過)`
                                  : '期限なし'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[280px]">
                    <div className="flex flex-row justify-between items-center p-3 w-full bg-[#F3E8FF] rounded-t-[10px]">
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">進行中</span>
                      <span className="flex items-center justify-center px-2 py-1 bg-[#E9D4FF] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#8200DB]">{taskStats.inProgress}</span>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {tasks.filter((t) => t.status === 'in-progress').map((task) => {
                        const priorityBadge = getPriorityBadge(task.priority);
                        return (
                          <div
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleExpertTaskCardClick(task)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExpertTaskCardClick(task)}
                            className="flex flex-col gap-3 p-4 bg-white border-2 border-[#E9D4FF] rounded-[10px] cursor-pointer hover:border-[#9810FA] hover:shadow-sm transition-colors"
                          >
                            <div className="flex flex-row justify-between items-start gap-2">
                              <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                                <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] truncate">{task.title}</span>
                                {task.is_new && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6] flex-shrink-0">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center justify-center px-2 py-1 rounded text-xs font-normal leading-4 flex-shrink-0" style={{ backgroundColor: priorityBadge.bg, border: `1px solid ${priorityBadge.border}`, color: priorityBadge.text }}>{priorityBadge.label}</span>
                            </div>
                            <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.description}</p>
                            <div className="flex flex-row items-center gap-2">
                              <UserIcon size={16} color="#99A1AF" />
                              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.assignee}</span>
                            </div>
                            <div className="flex flex-row items-center gap-2">
                              <ClockIcon size={16} color="#99A1AF" />
                              <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                                {task.dueDate || '期限なし'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Completed Column */}
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[280px]">
                    <div className="flex flex-row justify-between items-center p-3 w-full bg-[#DCFCE7] rounded-t-[10px]">
                      <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">完了</span>
                      <span className="flex items-center justify-center px-2 py-1 bg-[#B9F8CF] rounded text-sm font-normal leading-5 tracking-[-0.150391px] text-[#008236]">{taskStats.completed}</span>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {tasks.filter((t) => t.status === 'completed').map((task) => (
                        <div
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleExpertTaskCardClick(task)}
                          onKeyDown={(e) => e.key === 'Enter' && handleExpertTaskCardClick(task)}
                          className="flex flex-col gap-3 p-4 bg-white opacity-75 border border-[#B9F8CF] rounded-[10px] cursor-pointer hover:border-[#9810FA] hover:opacity-100 hover:shadow-sm transition-colors"
                        >
                          <div className="flex flex-row justify-between items-start gap-2">
                            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                              <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] line-through truncate">{task.title}</span>
                              {task.is_new && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6] flex-shrink-0">
                                  NEW
                                </span>
                              )}
                            </div>
                            <CheckIcon size={20} color="#00A63E" />
                          </div>
                          <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.description}</p>
                          <div className="flex flex-row items-center gap-2">
                            <UserIcon size={16} color="#99A1AF" />
                            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">{task.assignee}</span>
                          </div>
                          <div className="flex flex-row items-center gap-2">
                            <CheckIcon size={16} color="#00A63E" />
                            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#00A63E]">完了</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Documents Tab Content - Figma: 2-column equal width, 24px gap */}
            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6 py-4 w-full bg-[#F9FAFB] min-h-0 flex-1">
                {/* Left: 書類リスト（専門家共有 / 顧客提出 をセクション分け） */}
                <div className="flex flex-col min-w-0 bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                  <div className="flex flex-col border-b border-[#E5E7EB] px-4 py-[15px] min-h-[63px] justify-center">
                    <h2 className="text-xl font-medium leading-[30px] tracking-[-0.45px] text-[#101828]">書類リスト</h2>
                  </div>
                  {docsLoading && dbDocs.length === 0 ? (
                    <div className="flex items-center justify-center py-12 px-4">
                      <span className="text-sm text-[#6A7282]">読み込み中...</span>
                    </div>
                  ) : dbDocs.length === 0 ? (
                    <div className="flex items-center justify-center py-12 px-4">
                      <span className="text-sm text-[#6A7282]">書類がありません</span>
                    </div>
                  ) : (
                    <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-[#E5E7EB]">
                      {/* 専門家共有セクション */}
                      <div className="flex flex-col">
                        <div className="px-4 py-3 bg-[#F9FAFB]">
                          <h3 className="text-sm font-medium text-[#4A5565]">専門家が共有した書類</h3>
                        </div>
                        {dbDocs.filter((d) => d.is_expert_shared).length === 0 ? (
                          <div className="flex items-center justify-center py-6 px-4">
                            <span className="text-xs text-[#6A7282]">専門家共有の書類はありません</span>
                          </div>
                        ) : (
                          dbDocs
                            .filter((d) => d.is_expert_shared)
                            .map((doc) => {
                              const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
                                not_submitted: { label: 'アップロード待ち', bg: '#F3F4F6', text: '#364153' },
                                submitted: { label: '確認待ち', bg: '#FEF9C3', text: '#854D0E' },
                                reviewing: { label: '検討中', bg: '#DBEAFE', text: '#1447E6' },
                                approved: { label: '承認', bg: '#DCFCE7', text: '#008236' },
                                rejected: { label: '却下', bg: '#FFE2E2', text: '#C10007' },
                              };
                              const st = statusStyles[doc.status] ?? statusStyles.not_submitted;
                              const isSelected = selectedDocId === doc.id;
                              const dateStr = doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }).replace(/\//g, '-')
                                : '';

                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocId(doc.id);
                                    setReviewingDocId(null);
                                    setReviewComment('');
                                    // 専門家共有書類の NEW はカードをクリックしたタイミングで既読扱いにする
                                    if (doc.is_new) {
                                      setDbDocs((prev) =>
                                        prev.map((d) =>
                                          d.id === doc.id ? { ...d, is_new: false } : d
                                        )
                                      );
                                      fetch(`/api/cases/${caseId}/documents/${doc.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ is_new: false }),
                                      }).catch((e) =>
                                        console.error('Failed to clear expert-shared doc NEW flag:', e)
                                      );
                                    }
                                  }}
                                  className={`flex flex-col gap-2 px-4 py-4 text-left border-t border-[#E5E7EB] transition-colors ${
                                    doc.status === 'approved' ? 'bg-[#FAF5FF]' : 'bg-white'
                                  } ${isSelected ? 'ring-2 ring-[#9810FA] ring-inset' : 'hover:bg-[#F9FAFB]'}`}
                                >
                                  <div className="flex flex-row items-center gap-3">
                                    <DocumentIcon
                                      size={20}
                                      color="#9810FA"
                                      className="flex-shrink-0"
                                    />
                                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                                      <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] truncate">
                                        {doc.title}
                                      </h3>
                                      {doc.is_new && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6] flex-shrink-0">
                                          NEW
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="px-2 py-1 rounded-[4px] text-xs font-normal leading-4"
                                      style={{ backgroundColor: st.bg, color: st.text }}
                                    >
                                      {st.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-row items-center justify-end gap-2 flex-wrap pl-8 pt-3">
                                    {dateStr && (
                                      <span className="text-xs leading-4 text-[#6A7282]">
                                        {dateStr}
                                      </span>
                                    )}
                                  </div>
                                  {doc.status === 'rejected' && doc.feedback && (
                                    <p className="text-sm text-[#E7000B] leading-5 line-clamp-2 pl-8">
                                      {doc.feedback}
                                    </p>
                                  )}
                                </button>
                              );
                            })
                        )}
                      </div>

                      {/* 顧客提出セクション */}
                      <div className="flex flex-col border-t border-[#E5E7EB]">
                        <div className="px-4 py-3 bg-[#F9FAFB]">
                          <h3 className="text-sm font-medium text-[#4A5565]">顧客が提出した書類</h3>
                        </div>
                        {dbDocs.filter((d) => !d.is_expert_shared).length === 0 ? (
                          <div className="flex items-center justify-center py-6 px-4">
                            <span className="text-xs text-[#6A7282]">顧客提出の書類はありません</span>
                          </div>
                        ) : (
                          dbDocs
                            .filter((d) => !d.is_expert_shared)
                            .map((doc) => {
                              const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
                                not_submitted: { label: 'アップロード待ち', bg: '#F3F4F6', text: '#364153' },
                                submitted: { label: '確認待ち', bg: '#FEF9C3', text: '#854D0E' },
                                reviewing: { label: '検討中', bg: '#DBEAFE', text: '#1447E6' },
                                approved: { label: '承認', bg: '#DCFCE7', text: '#008236' },
                                rejected: { label: '却下', bg: '#FFE2E2', text: '#C10007' },
                              };
                              const st = statusStyles[doc.status] ?? statusStyles.not_submitted;
                              const isSelected = selectedDocId === doc.id;
                              const dateStr = doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }).replace(/\//g, '-')
                                : '';

                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocId(doc.id);
                                    setReviewingDocId(null);
                                    setReviewComment('');
                                  }}
                                  className={`flex flex-col gap-2 px-4 py-4 text-left border-t border-[#E5E7EB] transition-colors ${
                                    doc.status === 'approved' ? 'bg-[#FAF5FF]' : 'bg-white'
                                  } ${isSelected ? 'ring-2 ring-[#9810FA] ring-inset' : 'hover:bg-[#F9FAFB]'}`}
                                >
                                  <div className="flex flex-row items-center gap-3">
                                    <DocumentIcon
                                      size={20}
                                      color="#99A1AF"
                                      className="flex-shrink-0"
                                    />
                                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                                      <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] truncate">
                                        {doc.title}
                                      </h3>
                                      {doc.is_new && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6] flex-shrink-0">
                                          NEW
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="px-2 py-1 rounded-[4px] text-xs font-normal leading-4"
                                      style={{ backgroundColor: st.bg, color: st.text }}
                                    >
                                      {st.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-row items-center justify-end gap-2 flex-wrap pl-8 pt-3">
                                    {dateStr && (
                                      <span className="text-xs leading-4 text-[#6A7282]">
                                        {dateStr}
                                      </span>
                                    )}
                                  </div>
                                  {doc.status === 'rejected' && doc.feedback && (
                                    <p className="text-sm text-[#E7000B] leading-5 line-clamp-2 pl-8">
                                      {doc.feedback}
                                    </p>
                                  )}
                                </button>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: 書類詳細 */}
                <div className="flex flex-col min-w-0 bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                  {selectedDocId !== null && dbDocs.find((d) => d.id === selectedDocId) ? (
                    (() => {
                      const doc = dbDocs.find((d) => d.id === selectedDocId)!;
                      const canReview = doc.status === 'submitted' || doc.status === 'reviewing';
                      return (
                        <>
                          <div className="flex flex-row items-start justify-between gap-3 px-4 py-4 border-b border-[#E5E7EB]">
                            <div className="flex flex-col gap-2 min-w-0">
                              <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">{doc.title}</h3>
                            </div>
                            {/* Figma: 左＝別窓で開く（プレビュー）, 右＝ダウンロード（32×24, #f3f4f6, 角4, 間隔8px） */}
                            <div className="flex flex-row items-center gap-2 flex-shrink-0">
                              {doc.file_path && (
                                <>
                                  <a
                                    href={`/api/cases/${caseId}/documents/${doc.id}/preview`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-[32px] h-[24px] rounded-[4px] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
                                    title="別窓で開く"
                                  >
                                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="#4A5565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDocumentDownloadClick(doc.id);
                                    }}
                                    className="flex items-center justify-center w-[32px] h-[24px] rounded-[4px] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
                                    title="ダウンロード"
                                  >
                                    <DownloadIcon size={16} color="#4A5565" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col flex-1 overflow-y-auto p-4">
                            {/* プレビュー（Figma: グレー枠の下にキャプションを配置） */}
                            <div className="flex flex-col gap-2">
                              {doc.is_expert_shared ? (
                                <div className="flex flex-col items-center justify-center w-full rounded-[10px] bg-[#F3F4F6] min-h-[208px] aspect-[4/3] max-h-[280px] text-xs text-[#6A7282]">
                                  この書類はプレビューを表示せず、上部のダウンロードボタンからのみ保存できます。
                                </div>
                              ) : doc.file_path ? (
                                (() => {
                                  const ext = (doc.file_name || doc.file_path || '').split('.').pop()?.toLowerCase() ?? '';
                                  const previewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'txt', 'csv', 'html', 'htm'].includes(ext);
                                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
                                  return previewable ? (
                                    <>
                                      <div className="w-full rounded-[10px] bg-[#F3F4F6] min-h-[208px] aspect-[4/3] max-h-[320px] overflow-hidden border border-[#E5E7EB] flex items-center justify-center">
                                        {isImage ? (
                                          /* eslint-disable-next-line @next/next/no-img-element -- API preview URL, dimensions unknown */
                                          <img
                                            src={`/api/cases/${caseId}/documents/${doc.id}/preview`}
                                            alt={doc.file_name || '書類プレビュー'}
                                            className="max-w-full max-h-full object-contain rounded-[10px]"
                                          />
                                        ) : (
                                          <iframe
                                            src={`/api/cases/${caseId}/documents/${doc.id}/preview`}
                                            className="w-full h-full min-h-0 rounded-[10px] bg-white"
                                            title="書類プレビュー"
                                          />
                                        )}
                                      </div>
                                      <p className="text-xs leading-4 text-[#6A7282] text-center">
                                        ※ ブラウザで表示可能な形式（PDF・画像など）の場合にここにプレビューが表示されます。
                                      </p>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 w-full rounded-[10px] bg-[#F3F4F6] min-h-[208px] aspect-[4/3] max-h-[280px] text-xs text-[#6A7282]">
                                      <span>この形式（.{ext}）はプレビューに対応していません。</span>
                                      <button
                                        type="button" 
                                        onClick={() => handleDocumentDownloadClick(doc.id)}
                                        className="mt-1 px-4 py-2 rounded-[10px] bg-[#9810FA] text-white text-sm hover:bg-[#8200DB] transition-colors"
                                      >
                                        ダウンロードして確認
                                      </button>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex flex-col items-center justify-center w-full rounded-[10px] bg-[#F3F4F6] min-h-[208px] aspect-[4/3] max-h-[280px] text-xs text-[#6A7282]">
                                  書類ファイルがまだアップロードされていません。
                                </div>
                              )}
                            </div>
                            {/* 検討コメント＆承認/却下ボタン（顧客提出書類のみ表示） */}
                            {!doc.is_expert_shared && (
                              <div className="flex flex-col gap-2 border-t border-[#E5E7EB] pt-4 mt-4">
                                <label className="text-sm font-normal leading-5 text-[#364153]">検討コメント</label>
                                <textarea
                                  value={canReview ? reviewComment : (doc.status === 'rejected' ? doc.feedback : doc.expert_comment) ?? ''}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="書類検討意見を入力してください..."
                                  readOnly={!canReview}
                                  className={`w-full min-h-[78px] px-4 py-2.5 border border-[#D1D5DC] rounded-[10px] text-sm leading-5 text-[#0A0A0A] placeholder:opacity-50 focus:outline-none focus:border-[#9810FA] resize-none ${!canReview ? 'bg-[#F9FAFB] cursor-default' : ''}`}
                                />
                                {/* 承認/却下：コメント入力幅いっぱい、2等分 */}
                                <div className="flex flex-row gap-2 mt-1 w-full">
                                  <button
                                    type="button"
                                    onClick={() => canReview && handleDocStatusChange(doc.id, 'approved', reviewComment)}
                                    disabled={!canReview}
                                    className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[10px] bg-[#00A63E] hover:bg-[#008236] transition-colors text-[16px] leading-6 tracking-[-0.3125px] text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                                  >
                                    <CheckIcon size={16} color="#FFFFFF" />
                                    <span>承認</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => canReview && handleDocStatusChange(doc.id, 'rejected', reviewComment)}
                                    disabled={!canReview}
                                    className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[10px] bg-[#E7000B] hover:bg-[#C10007] transition-colors text-[16px] leading-6 tracking-[-0.3125px] text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                                  >
                                    <XIcon size={16} color="#FFFFFF" />
                                    <span>却下</span>
                                  </button>
                                </div>
                                {doc.status === 'rejected' && doc.feedback && (
                                  <p className="text-sm text-[#E7000B] leading-5">フィードバック: {doc.feedback}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col flex-1 items-center justify-center py-16 px-4 text-center">
                      <DocumentIcon size={48} color="#D1D5DC" className="mb-3" />
                      <p className="text-sm text-[#6A7282]">書類を選択すると詳細が表示されます</p>
                    </div>
                  )}
                </div>
              </div>
            )}

                {/* Add Document Modal（書類名のみ＝顧客提出用 / ファイル添付＝専門家アップロード） */}
                {addDocModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col gap-4 p-6 bg-white rounded-[14px] w-[440px] max-w-[90vw] shadow-xl max-h-[90vh] overflow-y-auto">
                      <div className="flex flex-row justify-between items-center">
                        <h3 className="text-lg font-medium text-[#101828]">書類を追加</h3>
                        <button onClick={() => { setAddDocModalOpen(false); setAddDocFile(null); }}>
                          <XIcon size={20} color="#6A7282" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-[#364153]">書類名 {addDocFile ? '（任意・未入力時はファイル名）' : '*'}</label>
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="例: 事業計画書"
                          className="w-full px-3 py-2 border border-[#D1D5DC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9810FA]"
                        />
                      </div>
                      {!addDocFile && (
                        <label className="flex items-center gap-2 text-sm text-[#364153]">
                          <input
                            type="checkbox"
                            checked={newDocRequired}
                            onChange={(e) => setNewDocRequired(e.target.checked)}
                            className="rounded border-[#D1D5DC]"
                          />
                          必須書類
                        </label>
                      )}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-[#364153]">ファイル（任意）</label>
                        <p className="text-xs text-[#6A7282]">ファイルを添付すると、顧客に共有する書類としてアップロードされます。添付しない場合は顧客が後から提出する書類として追加されます。</p>
                        <input
                          ref={addDocFileInputRef}
                          type="file"
                          className="hidden"
                          accept={getAcceptAttribute()}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const validation = validateUploadFile(file);
                              if (!validation.ok) {
                                alert(validation.error);
                              } else {
                                setAddDocFile(file);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                        {addDocFile ? (
                          <div className="flex flex-row items-center gap-3 p-3 bg-[#FAF5FF] border border-[#E9D4FF] rounded-lg">
                            <DocumentIcon size={20} color="#9810FA" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-[#101828] truncate block">{addDocFile.name}</span>
                              <span className="text-xs text-[#6A7282]">{Math.round(addDocFile.size / 1024)}KB</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddDocFile(null)}
                              className="flex-shrink-0 p-1 hover:bg-[#F3E8FF] rounded"
                            >
                              <XIcon size={16} color="#6A7282" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addDocFileInputRef.current?.click()}
                            onDragOver={handleAddDocDragOver}
                            onDrop={handleAddDocDrop}
                            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#D1D5DC] rounded-lg hover:border-[#9810FA] hover:bg-[#FAF5FF] transition-colors cursor-pointer"
                          >
                            <UploadIcon size={24} color="#9810FA" />
                            <span className="text-sm text-[#6A7282]">クリックしてファイルを選択</span>
                            <span className="text-xs text-[#99A1AF]">またはここにファイルをドラッグ＆ドロップ</span>
                            <span className="text-xs text-[#99A1AF]">最大10MB</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-row gap-2 justify-end">
                        <button
                          onClick={() => { setAddDocModalOpen(false); setAddDocFile(null); }}
                          className="px-4 py-2 bg-[#F3F4F6] rounded-lg text-sm text-[#364153] hover:bg-[#E5E7EB] transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleAddDocumentSubmit}
                          disabled={(!newDocTitle.trim() && !addDocFile) || addDocSaving}
                          className="px-4 py-2 bg-[#9810FA] rounded-lg text-sm text-white hover:bg-[#7D0DD4] transition-colors disabled:opacity-50"
                        >
                          {addDocSaving ? '処理中...' : '追加'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

            {/* Timeline Tab Content */}
            {activeTab === 'timeline' && (
              <TimelineTab
                timelineItems={caseActivities}
                timelineLoading={caseActivitiesLoading}
                onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
              />
            )}
          </div>
        </div>

        {/* xl以上: レイアウト用スペーサー(固定パネル分の幅を確保) */}
        {isMessagePanelOpen && (
          <div className="hidden xl:block xl:flex-shrink-0 xl:w-[383px]" aria-hidden />
        )}
        {/* Right Message Panel - xl未満: 全画面モーダル / xl以上: 画面右に固定で常に表示・入力は画面下端 */}
        {isMessagePanelOpen && (
          <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-white overflow-hidden xl:inset-auto xl:right-0 xl:top-0 xl:bottom-0 xl:left-auto xl:w-[383px] xl:max-h-screen xl:z-40 xl:overflow-hidden border-[#E5E7EB] xl:border-l">
            {/* Message Header */}
            <div className="flex-shrink-0 flex flex-row justify-between items-center px-4 lg:px-6 py-4 lg:py-6 w-full border-b border-[#E5E7EB]">
              <div className="flex flex-row items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#2B7FFF] to-[#155DFC]">
                  <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-white">
                    {(customerInfo.company || customerInfo.name || '—').trim()[0] || '?'}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <h3 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                    {customerInfo.company?.trim() || customerInfo.name?.trim() || '—'}
                  </h3>
                  <span className={`text-xs font-normal leading-4 ${customerOnline === true ? 'text-[#00C950]' : customerOnline === false ? 'text-[#6A7282]' : 'text-[#9CA3AF]'}`}>
                    {customerOnline === true ? 'オンライン' : customerOnline === false ? 'オフライン' : '—'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMessagePanelOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F3F4F6] transition-colors"
              >
                <XIcon size={20} color="#6A7282" />
              </button>
            </div>

            {/* Messages - ここだけスクロール、常に最新が下で見えるよう ref でスクロール位置を下へ */}
            <div ref={messagesScrollRef} className="flex-1 min-h-0 flex flex-col items-start gap-4 px-4 lg:px-6 pt-4 lg:pt-6 pb-10 w-full overflow-y-auto overflow-x-hidden bg-[#F9FAFB] overscroll-contain">
              {caseMessagesLoading ? (
                <p className="text-sm text-[#6A7282]">読み込み中...</p>
              ) : caseMessages.length === 0 ? (
                <p className="text-sm text-[#6A7282]">メッセージはまだありません。</p>
              ) : (
                caseMessages.map((message) => {
                  const d = new Date(message.created_at);
                  const year = d.getFullYear();
                  const month = d.getMonth() + 1;
                  const day = d.getDate();
                  const hours = d.getHours();
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  const ampm = hours < 12 ? '午前' : '午後';
                  const hour12 = hours % 12 || 12;
                  const dateTimeStr = `${year}. ${month}. ${day}. ${ampm} ${hour12}:${minutes}`;
                  const isExpert = message.is_expert;
                  const msgAttachments = (message as CaseMessage).attachments ?? [];
                  const isImageAttachment = (fileName: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                  return (
                    <div key={message.id} className={`flex flex-col gap-2 w-full ${isExpert ? 'items-end' : 'items-start'}`}>
                      <div className={`flex flex-row items-start gap-3 max-w-[90%] ${isExpert ? 'flex-row-reverse ml-auto' : ''}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${isExpert ? 'bg-[#9810FA]' : 'bg-gradient-to-br from-[#2B7FFF] to-[#155DFC]'}`}>
                          <span className="text-xs font-normal leading-4 text-white">{message.sender_initial}</span>
                        </div>
                        <div className={`flex flex-col gap-1 ${isExpert ? 'items-end' : 'items-start'}`}>
                          <div className={`flex flex-col p-3 gap-2 rounded-[10px] ${isExpert ? 'bg-[#9810FA] text-white' : 'bg-[#F3F4F6]'}`}>
                            {message.content ? (
                              <p className={`text-sm font-normal leading-5 tracking-[-0.150391px] whitespace-pre-line ${isExpert ? 'text-white' : 'text-[#0A0A0A]'}`}>{message.content}</p>
                            ) : null}
                            {msgAttachments.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {msgAttachments.map((a) =>
                                  isImageAttachment(a.file_name) ? (
                                    <a
                                      key={a.id}
                                      href={`/api/cases/${caseId}/messages/attachments/${a.id}/download`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`block max-w-[200px] rounded-lg overflow-hidden border ${isExpert ? 'border-white/30' : 'border-[#E5E7EB]'}`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`/api/cases/${caseId}/messages/attachments/${a.id}/download`}
                                        alt={a.file_name}
                                        className="w-full h-auto max-h-48 object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={a.id}
                                      href={`/api/cases/${caseId}/messages/attachments/${a.id}/download`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-xs hover:underline ${isExpert ? 'text-white/90' : 'text-[#155DFC]'}`}
                                    >
                                      {a.file_name}
                                    </a>
                                  )
                                )}
                              </div>
                            ) : null}
                          </div>
                          <span className="text-xs font-normal leading-4 text-[#6A7282]">{dateTimeStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input - Figma: padding 17px 16px 0px, gap 8px, bg #F9FAFB */}
            <div className="flex-shrink-0 flex flex-col items-start px-4 pt-[17px] pb-6 gap-2 w-full bg-[#F9FAFB] border-t border-[#E5E7EB]">
              {/* 添付プレビュー */}
              {messageAttachment && (
                <div className="flex flex-row items-start gap-2 w-full p-2 bg-white border border-[#E5E7EB] rounded-[10px]">
                  {messageAttachment.type.startsWith('image/') && messagePreviewUrl ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={messagePreviewUrl} alt={messageAttachment.name} className="w-16 h-16 lg:w-20 lg:h-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => { setMessageAttachment(null); if (messageFileInputRef.current) messageFileInputRef.current.value = ''; }}
                        className="absolute -top-1 -right-1 flex justify-center items-center w-5 h-5 rounded-full bg-[#4A5565] text-white hover:bg-[#364153]"
                        aria-label="添付を解除"
                      >
                        <XIcon size={12} color="#FFFFFF" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center gap-2 flex-grow min-w-0">
                      <DocumentIcon size={20} color="#4A5565" className="flex-shrink-0" />
                      <span className="text-sm text-[#4A5565] truncate flex-grow" title={messageAttachment.name}>{messageAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => { setMessageAttachment(null); if (messageFileInputRef.current) messageFileInputRef.current.value = ''; }}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100"
                        aria-label="添付を解除"
                      >
                        <XIcon size={14} color="#4A5565" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col items-start p-[1px] w-full bg-white border border-[#D1D5DC] rounded-[10px]">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="メッセージを入力"
                  rows={3}
                  className="w-full px-4 py-3 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.5)] bg-transparent border-none focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col items-start gap-2 w-full">
                <div className="flex flex-row justify-between items-center gap-1 w-full">
                  <input
                    id="expert-message-file-attach"
                    ref={messageFileInputRef}
                    type="file"
                    className="hidden"
                    accept={getAcceptAttribute()}
                    onChange={(e) => { const f = e.target.files?.[0]; setMessageAttachment(f ?? null); }}
                  />
                  <label
                    htmlFor="expert-message-file-attach"
                    className="flex flex-row items-center px-2 gap-1.5 h-10 bg-[#EDEDED] rounded-[10px] hover:bg-[#E0E0E0] transition-colors cursor-pointer"
                  >
                    <PaperclipIcon size={16} color="#4A5565" />
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] text-center">
                      ファイル添付
                    </span>
                  </label>

                  {/* Template Button + Dropdown */}
                  <div ref={messageTemplateDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMessageTemplateOpen((v) => !v)}
                      className="flex flex-row items-center px-2 gap-1.5 h-10 bg-[#FAF5FF] border border-[#E9D4FF] rounded-[10px] hover:bg-[#F3E8FF] transition-colors"
                    >
                      <DocumentIcon size={16} color="#9810FA" />
                      <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA] text-center">
                        テンプレート
                      </span>
                    </button>
                    {isMessageTemplateOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg py-1"
                        data-dropdown-menu
                      >
                        {messageTemplates.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-[#6A7282]">テンプレートがありません</div>
                        ) : (
                          messageTemplates.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#F9FAFB] border-b border-[#F3F4F6] last:border-b-0"
                              onClick={() => {
                                setMessageInput((prev) => (prev ? `${prev}\n\n${m.content}` : m.content));
                                setIsMessageTemplateOpen(false);
                              }}
                            >
                              {m.title || '(無題)'}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={(!messageInput.trim() && !messageAttachment) || caseMessagesSending}
                    className={`flex flex-row items-center justify-center px-5 gap-1.5 h-10 rounded-[10px] transition-colors disabled:cursor-not-allowed ${
                      messageInput.trim() || messageAttachment ? 'bg-[#155DFC] hover:bg-[#1447E6]' : 'bg-[#155DFC] opacity-50'
                    }`}
                  >
                    <SendIcon size={16} color="#FFFFFF" />
                    <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white text-center">
                      {caseMessagesSending ? '送信中...' : '送信'}
                    </span>
                  </button>
                </div>

                {/* Help Text */}
                <p className="text-xs font-normal leading-4 text-[#6A7282]">
                  Ctrl/Cmd + Enterで送信できます
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Message Button - Fixed at bottom right */}
      {!isMessagePanelOpen && (
        <button
          onClick={() => setIsMessagePanelOpen(true)}
          className="fixed bottom-6 right-6 flex flex-row items-center gap-2 px-5 py-3 bg-[#9810FA] rounded-full shadow-lg hover:bg-[#7A0DC8] transition-colors z-50"
        >
          <ChatBubbleIcon size={20} color="#FFFFFF" />
          <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-white whitespace-nowrap">
            メッセージを開く
          </span>
        </button>
      )}

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskType={taskType}
        setTaskType={setTaskType}
        formQuestions={formQuestions}
        setFormQuestions={setFormQuestions}
        caseId={caseId}
        onTaskCreated={fetchTasks}
      />

      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => { setSelectedTask(null); setTaskDetailMode('view'); }}
          title={taskDetailMode === 'edit' ? 'タスク編集' : selectedTask.title}
          subtitle={taskDetailMode === 'edit' ? selectedTask.title : 'タスク詳細'}
          footer={
            taskDetailMode === 'view' ? (
              <div className="flex flex-col gap-3 px-4 lg:px-6 py-3 border-t border-[#E5E7EB]">
                {/* 承認/却下ボタン（提出済みの場合のみ） */}
                {selectedTask.rawStatus === 'submitted' && (
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      disabled={taskActionLoading}
                      onClick={async () => {
                        if (!selectedTask || taskActionLoading) return;
                        setTaskActionLoading(true);
                        try {
                          const res = await fetch(`/api/tasks/${selectedTask.id}/approve`, { method: 'POST' });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            alert(err.error || '承認に失敗しました');
                            return;
                          }
                          await fetchTasks();
                          setSelectedTask(null);
                        } finally {
                          setTaskActionLoading(false);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-[#00C950] text-white text-sm font-medium rounded-[10px] hover:bg-[#00A63E] transition-colors disabled:opacity-50"
                    >
                      {taskActionLoading ? '処理中...' : '承認'}
                    </button>
                    <button
                      type="button"
                      disabled={taskActionLoading}
                      onClick={() => setRejectModalOpen(true)}
                      className="flex-1 px-4 py-2.5 bg-[#FB2C36] text-white text-sm font-medium rounded-[10px] hover:bg-[#E01E28] transition-colors disabled:opacity-50"
                    >
                      却下
                    </button>
                  </div>
                )}
                {/* 状態変更ボタン */}
                <div className="flex flex-row gap-2">
                  {selectedTask.rawStatus === 'pending' && (
                    <button
                      type="button"
                      disabled={taskActionLoading}
                      onClick={async () => {
                        if (!selectedTask || taskActionLoading) return;
                        setTaskActionLoading(true);
                        try {
                          const res = await fetch(`/api/tasks/${selectedTask.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'in_progress' }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            alert(err.error || '更新に失敗しました');
                            return;
                          }
                          await fetchTasks();
                          setSelectedTask(null);
                        } finally {
                          setTaskActionLoading(false);
                        }
                      }}
                      className="px-4 py-2.5 bg-[#8200DB] text-white text-sm font-medium rounded-[10px] hover:bg-[#6A00B3] transition-colors disabled:opacity-50"
                    >
                      進行中にする
                    </button>
                  )}
                  {(selectedTask.rawStatus === 'pending' || selectedTask.rawStatus === 'in_progress') && (
                    <button
                      type="button"
                      disabled={taskActionLoading}
                      onClick={async () => {
                        if (!selectedTask || taskActionLoading) return;
                        setTaskActionLoading(true);
                        try {
                          const res = await fetch(`/api/tasks/${selectedTask.id}/complete`, { method: 'POST' });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            alert(err.error || '完了に失敗しました');
                            return;
                          }
                          await fetchTasks();
                          setSelectedTask(null);
                        } finally {
                          setTaskActionLoading(false);
                        }
                      }}
                      className="px-4 py-2.5 bg-[#00C950] text-white text-sm font-medium rounded-[10px] hover:bg-[#00A63E] transition-colors disabled:opacity-50"
                    >
                      完了にする
                    </button>
                  )}
                  {(selectedTask.rawStatus === 'approved' || selectedTask.rawStatus === 'completed') && (
                    <button
                      type="button"
                      disabled={taskActionLoading}
                      onClick={async () => {
                        if (!selectedTask || taskActionLoading) return;
                        setTaskActionLoading(true);
                        try {
                          const res = await fetch(`/api/tasks/${selectedTask.id}/complete`, { method: 'DELETE' });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            alert(err.error || '完了取消に失敗しました');
                            return;
                          }
                          await fetchTasks();
                          setSelectedTask(null);
                        } finally {
                          setTaskActionLoading(false);
                        }
                      }}
                      className="px-4 py-2.5 border border-[#D1D5DC] text-[#364153] text-sm font-medium rounded-[10px] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
                    >
                      完了を取消
                    </button>
                  )}
                </div>
                {/* 編集・削除ボタン */}
                <div className="flex flex-row justify-between gap-2">
                  <button
                    type="button"
                    disabled={taskActionLoading}
                    onClick={async () => {
                      if (!selectedTask || taskActionLoading) return;
                      if (!confirm('このタスクを削除しますか？')) return;
                      setTaskActionLoading(true);
                      try {
                        const taskId = selectedTask.id;
                        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          alert(data.error || '削除に失敗しました');
                          return;
                        }
                        await fetchTasks();
                        setSelectedTask(null);
                      } catch (e) {
                        console.error('Delete task error:', e);
                        alert('削除に失敗しました');
                      } finally {
                        setTaskActionLoading(false);
                      }
                    }}
                    className="px-4 py-2.5 border border-[#FFC9C9] text-[#C10007] text-sm font-medium rounded-[10px] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                  >
                    削除
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setTaskEditForm({
                        title: selectedTask.title,
                        description: selectedTask.description,
                        priority: selectedTask.priority,
                        deadline: selectedTask.deadline ?? '',
                      });
                      if (selectedTask.type === 'form_input') {
                        try {
                          const res = await fetch(`/api/tasks/${selectedTask.id}/form`);
                          const data = await res.json().catch(() => ({}));
                          const questions = (data.questions ?? []) as { id: number; question_text?: string }[];
                          setTaskEditFormQuestions(
                            questions.length > 0
                              ? questions.map((q) => ({ id: String(q.id), question: q.question_text ?? '' }))
                              : [{ id: generateId(), question: '' }]
                          );
                        } catch {
                          setTaskEditFormQuestions([{ id: generateId(), question: '' }]);
                        }
                      } else {
                        setTaskEditFormQuestions([]);
                      }
                      setTaskDetailMode('edit');
                    }}
                    className="px-4 py-2.5 bg-[#9810FA] text-white text-sm font-medium rounded-[10px] hover:bg-[#7A0DC8] transition-colors"
                  >
                    編集
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-row justify-end gap-2 px-4 lg:px-6 py-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setTaskDetailMode('view')}
                  className="px-4 py-2.5 border border-[#D1D5DC] text-[#364153] text-sm font-medium rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={taskEditSaving || !taskEditForm.title.trim()}
                  onClick={async () => {
                    if (!selectedTask || taskEditSaving || !taskEditForm.title.trim()) return;
                    setTaskEditSaving(true);
                    try {
                      const body: { title: string; description?: string; priority: string; deadline?: string; form_questions?: { question: string; order: number }[] } = {
                        title: taskEditForm.title.trim(),
                        description: taskEditForm.description.trim() || undefined,
                        priority: taskEditForm.priority,
                        deadline: taskEditForm.deadline || undefined,
                      };
                      if (selectedTask.type === 'form_input') {
                        body.form_questions = taskEditFormQuestions
                          .filter((q) => q.question.trim())
                          .map((q, i) => ({ question: q.question.trim(), order: i + 1 }));
                      }
                      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        alert(err.error || '更新に失敗しました');
                        return;
                      }
                      await fetchTasks();
                      setSelectedTask(null);
                      setTaskDetailMode('view');
                    } finally {
                      setTaskEditSaving(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-[#9810FA] text-white text-sm font-medium rounded-[10px] hover:bg-[#7A0DC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskEditSaving ? '保存中...' : '保存'}
                </button>
              </div>
            )
          }
        >
          {taskDetailMode === 'view' ? (
            <div className="flex flex-col gap-4 text-sm px-4 lg:px-6 pb-4 lg:pb-6 pt-2">
              <p className="text-[#4A5565]">{selectedTask.description || '（説明なし）'}</p>
              <div className="flex flex-row flex-wrap gap-4">
                <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: getPriorityBadge(selectedTask.priority).bg, border: `1px solid ${getPriorityBadge(selectedTask.priority).border}`, color: getPriorityBadge(selectedTask.priority).text }}>
                  {getPriorityBadge(selectedTask.priority).label}
                </span>
                <span className="text-[#4A5565]">ステータス: {selectedTask.status}</span>
              </div>
              <div className="flex flex-col gap-1 text-[#4A5565]">
                <span>担当: {selectedTask.assignee}</span>
                <span>
                  期限: {selectedTask.dueDate
                    ? selectedTask.daysLeft > 0
                      ? `${selectedTask.dueDate} (残り ${selectedTask.daysLeft}日)`
                      : selectedTask.daysLeft === 0
                        ? `${selectedTask.dueDate} (今日が期限)`
                        : `${selectedTask.dueDate} (${Math.abs(selectedTask.daysLeft)}日超過)`
                    : '期限なし'}
                </span>
              </div>
              {selectedTask.rejectionReason && (
                <p className="text-[#E7000B]">却下理由: {selectedTask.rejectionReason}</p>
              )}
              {(selectedTask.type === 'file_upload' || taskAttachments.length > 0) && (
                <div
                  className="flex flex-col gap-3 pt-2 border-t border-[#E5E7EB]"
                  onDragOver={selectedTask.type === 'file_upload' ? handleTaskFileDragOver : undefined}
                  onDrop={selectedTask.type === 'file_upload' ? (event) => handleTaskFileDrop(selectedTask.id, event) : undefined}
                >
                  <h4 className="text-sm font-medium text-[#101828]">添付書類</h4>
                  {taskAttachmentsLoading ? (
                    <p className="text-sm text-[#6A7282]">読み込み中...</p>
                  ) : taskAttachments.length === 0 ? (
                    <p className="text-sm text-[#6A7282]">アップロードされた書類はありません。</p>
                  ) : (
                    <>
                      {taskAttachments.some((a) => a.uploaded_by_me) && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-[#8200DB] bg-[#F3E8FF] border border-[#E9D4FF] px-2 py-1 rounded w-fit">
                            専門家がアップロード
                          </span>
                          <ul className="flex flex-col gap-1.5">
                            {taskAttachments.filter((a) => a.uploaded_by_me).map((a) => (
                              <li
                                key={String(a.id)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#FAF5FF] border border-[#E9D4FF]"
                              >
                                <DocumentIcon size={20} color="#8200DB" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-[#101828] truncate block">{a.file_name}</span>
                                  <span className="text-xs text-[#6A7282]">{Math.round(a.file_size / 1024)}KB</span>
                                </div>
                                {typeof a.id === 'number' && a.source === 'task_attachment' && (
                                  <a
                                    href={`/api/tasks/${selectedTask.id}/attachments/${a.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-[#8200DB] hover:underline rounded-lg border border-[#8200DB] hover:bg-[#F3E8FF] transition-colors"
                                  >
                                    ダウンロード
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {taskAttachments.some((a) => !a.uploaded_by_me) && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-[#1E40AF] bg-[#DBEAFE] border border-[#BEDBFF] px-2 py-1 rounded w-fit">
                            顧客がアップロード
                          </span>
                          <ul className="flex flex-col gap-1.5">
                            {taskAttachments.filter((a) => !a.uploaded_by_me).map((a) => (
                              <li
                                key={String(a.id)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#EFF6FF] border border-[#BEDBFF]"
                              >
                                <DocumentIcon size={20} color="#155DFC" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-[#101828] truncate block">{a.file_name}</span>
                                  <span className="text-xs text-[#6A7282]">{Math.round(a.file_size / 1024)}KB</span>
                                </div>
                                {typeof a.id === 'number' && a.source === 'task_attachment' && (
                                  <a
                                    href={`/api/tasks/${selectedTask.id}/attachments/${a.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-[#155DFC] hover:text-[#1447E6] hover:underline rounded-lg border border-[#155DFC] hover:bg-[#DBEAFE] transition-colors"
                                  >
                                    ダウンロード
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {selectedTask.type === 'form_input' && (
                <div className="flex flex-col gap-3 pt-2 border-t border-[#E5E7EB]">
                  <h4 className="text-sm font-medium text-[#101828]">フォーム質問・顧客の回答</h4>
                  {taskFormViewLoading ? (
                    <p className="text-sm text-[#6A7282]">読み込み中...</p>
                  ) : !taskFormViewData ? null : taskFormViewData.questions.length === 0 ? (
                    <p className="text-sm text-[#6A7282]">質問はまだ設定されていません。</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {taskFormViewData.questions.map((q) => (
                        <li key={q.id} className="flex flex-col gap-1 px-3 py-2.5 rounded-[10px] bg-[#F9FAFB] border border-[#E5E7EB]">
                          <span className="text-sm font-medium text-[#364153]">{q.question_text || '（質問文なし）'}</span>
                          <span className="text-sm text-[#101828]">{taskFormViewData.answers[q.id] != null && taskFormViewData.answers[q.id] !== '' ? taskFormViewData.answers[q.id] : '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-4 lg:px-6 pb-4 lg:pb-6 pt-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#364153]">タイトル</label>
                <input
                  type="text"
                  value={taskEditForm.title}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-[#101828] focus:outline-none focus:border-[#9810FA]"
                  placeholder="タスク名"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#364153]">説明</label>
                <textarea
                  value={taskEditForm.description}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-[#101828] focus:outline-none focus:border-[#9810FA] resize-none"
                  placeholder="説明（任意）"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#364153]">優先順位</label>
                <div className="relative">
                  <select
                    value={taskEditForm.priority}
                    onChange={(e) => setTaskEditForm((f) => ({ ...f, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                    className="w-full appearance-none px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-[#101828] focus:outline-none focus:border-[#9810FA]"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                  <ChevronDownIcon size={20} color="#4A5565" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#364153]">期限</label>
                <input
                  type="date"
                  value={taskEditForm.deadline}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-[#101828] focus:outline-none focus:border-[#9810FA]"
                />
              </div>
              {selectedTask.type === 'form_input' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E7EB]">
                  <label className="text-sm font-medium text-[#364153]">フォーム質問</label>
                  <div className="flex flex-col gap-3">
                    {taskEditFormQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        className="flex flex-col gap-1.5 px-3 py-2.5 border border-[#E5E7EB] rounded-[10px] bg-[#F9FAFB]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-[#4A5565]">質問 #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setTaskEditFormQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                            disabled={taskEditFormQuestions.length <= 1}
                            className="p-1 rounded hover:bg-[#FFECEE] text-[#6A7282] hover:text-[#C10007] disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="削除"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                        <textarea
                          value={q.question}
                          onChange={(e) =>
                            setTaskEditFormQuestions((prev) =>
                              prev.map((x) => (x.id === q.id ? { ...x, question: e.target.value } : x))
                            )
                          }
                          rows={2}
                          placeholder="質問文を入力"
                          className="w-full px-3 py-2 border border-[#D1D5DC] rounded-[8px] text-sm text-[#101828] focus:outline-none focus:border-[#9810FA] resize-none bg-white"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTaskEditFormQuestions((prev) => [...prev, { id: generateId(), question: '' }])}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-[10px] text-sm font-medium text-[#364153] bg-white hover:bg-[#F9FAFB]"
                    >
                      <PlusIcon size={16} />
                      質問を追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* 却下理由入力モーダル */}
      {rejectModalOpen && selectedTask && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => { setRejectModalOpen(false); setRejectReason(''); }}
          title="タスク却下"
          subtitle="却下理由を入力してください"
          footer={
            <div className="flex flex-row justify-end gap-2 px-4 lg:px-6 py-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                className="px-4 py-2.5 border border-[#D1D5DC] text-[#364153] text-sm font-medium rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={taskActionLoading || !rejectReason.trim()}
                onClick={async () => {
                  if (!selectedTask || taskActionLoading || !rejectReason.trim()) return;
                  setTaskActionLoading(true);
                  try {
                    const res = await fetch(`/api/tasks/${selectedTask.id}/reject`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: rejectReason.trim() }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      alert(err.error || '却下に失敗しました');
                      return;
                    }
                    await fetchTasks();
                    setRejectModalOpen(false);
                    setRejectReason('');
                    setSelectedTask(null);
                  } finally {
                    setTaskActionLoading(false);
                  }
                }}
                className="px-4 py-2.5 bg-[#FB2C36] text-white text-sm font-medium rounded-[10px] hover:bg-[#E01E28] transition-colors disabled:opacity-50"
              >
                {taskActionLoading ? '処理中...' : '却下する'}
              </button>
            </div>
          }
        >
          <div className="px-4 lg:px-6 pb-4 lg:pb-6 pt-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-[#D1D5DC] rounded-[10px] text-[#101828] focus:outline-none focus:border-[#FB2C36] resize-none"
              placeholder="却下理由を入力してください"
              autoFocus
            />
          </div>
        </Modal>
      )}

      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        caseId={caseId ?? ''}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        taskTemplates={taskTemplates}
        onSubmit={async (selectedTemplates) => {
          const assigneeRole = (assignee: string) =>
            assignee === 'アシスタント' ? 'assistant' : 'expert';
          const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
            高: 'high',
            中: 'medium',
            低: 'low',
          };
          for (const t of selectedTemplates) {
            const taskType = t.fileUrl ? 'file_upload' : 'general';
            const res = await fetch(`/api/expert/cases/${caseId}/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: t.title,
                description: t.description,
                type: taskType,
                assignee_role: assigneeRole(t.assignee),
                priority: priorityMap[t.priority] ?? 'medium',
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || 'タスクの作成に失敗しました');
            }
            const { task } = await res.json();
            const taskId = task?.id;

            if (taskId && t.fileUrl && t.fileName) {
              try {
                const fileRes = await fetch(t.fileUrl);
                if (fileRes.ok) {
                  const blob = await fileRes.blob();
                  const file = new File([blob], t.fileName, { type: blob.type });
                  const formData = new FormData();
                  formData.append('file', file);
                  await fetch(`/api/tasks/${taskId}/upload`, { method: 'POST', body: formData });
                }
              } catch (uploadErr) {
                console.error('テンプレートファイルのアップロードに失敗:', uploadErr);
              }
            }
          }
          await fetchTasks();
        }}
      />

      <DocumentTemplateModal
        isOpen={isDocTemplateModalOpen}
        onClose={() => setIsDocTemplateModalOpen(false)}
        documentTemplates={documentTemplates}
        onSubmit={async (template) => {
          if (!caseId) return;
          const res = await fetch(`/api/cases/${caseId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: template.title, is_required: false }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || '書類の追加に失敗しました');
          }
          await fetchDocs();
        }}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        timelineItems={caseActivities}
      />

      <HearingResponseViewer
        isOpen={isHearingViewerOpen}
        onClose={() => setIsHearingViewerOpen(false)}
        response={hearingResponse}
        onMarkReviewed={async (responseId, comment) => {
          if (!caseId) return;
          const res = await fetch(`/api/expert/cases/${caseId}/hearing/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || '確認済みの更新に失敗しました');
          }
          await fetchHearing();
        }}
      />

      {/* Status Dropdown Portal */}
      {openDropdownId !== null && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          data-dropdown-menu
          className="fixed w-[100px] bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg z-50 overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateStepStatus(openDropdownId, '進行前');
              setOpenDropdownId(null);
            }}
            className={`w-full px-3 py-2 text-xs font-normal leading-4 text-white text-left transition-colors ${
              stepStatuses[openDropdownId] === '進行前' ? 'bg-[#99A1AF]' : 'bg-[#6A7282] hover:bg-[#4A5565]'
            }`}
          >
            進行前
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateStepStatus(openDropdownId, '進行中');
              setOpenDropdownId(null);
            }}
            className={`w-full px-3 py-2 text-xs font-normal leading-4 text-white text-left transition-colors ${
              stepStatuses[openDropdownId] === '進行中' ? 'bg-[#AD46FF]' : 'bg-[#9810FA] hover:bg-[#7A0DC8]'
            }`}
          >
            進行中
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateStepStatus(openDropdownId, '完了');
              setOpenDropdownId(null);
            }}
            className={`w-full px-3 py-2 text-xs font-normal leading-4 text-white text-left transition-colors ${
              stepStatuses[openDropdownId] === '完了' ? 'bg-[#00C950]' : 'bg-[#00A63E] hover:bg-[#008236]'
            }`}
          >
            完了
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
