'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  UserIcon,
  CheckCircleIcon,
  HomeIcon,
  DocumentIcon,
  CheckIcon,
  ArrowRightIcon,
  UploadIcon,
  DownloadIcon,
  EyeIcon,
  DeleteIconAlt,
  PaperclipIcon,
  SendIcon,
  PlusIcon,
  XIcon,
  MailIcon,
  LinkIcon,
  EllipsisIcon,
  InfoIcon,
  LogOutIcon,
} from '@/components/icons';

// Types
import { TabType, ChecklistItem, ProjectInfo, HearingFormData, Step } from './types';

// Components
import HearingTab from './components/HearingTab';

// Data
import {
  checklistItems as defaultChecklistItems,
  steps,
  projectInfo as defaultProjectInfo,
  fetchCaseTasks,
  toggleTaskStatus,
  submitTask,
} from './data';
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';

const MEMBER_ROLE_STYLE: Record<string, { roleText: string; bg: string; border: string; text: string }> = {
  applicant: { roleText: '申請者', bg: '#DBEAFE', border: '#BEDBFF', text: '#1447E6' },
  introducer: { roleText: '紹介者', bg: '#FFE2E2', border: '#FFE2E2', text: '#C10007' },
  member: { roleText: 'メンバー', bg: '#E5E7EB', border: '#D1D5DC', text: '#364153' },
};

/** メンバー追加モーダル内の状態を閉じ込め、入力時に親の再レンダーで役割がリセットされないようにする */
function AddMemberModalContent({
  caseId,
  onClose,
  onKeyDown,
  onSuccess,
}: {
  caseId: string;
  onClose: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSuccess?: () => void;
}) {
  const [memberRole, setMemberRole] = useState<'member' | 'introducer'>('member');
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-6 lg:p-0"
      onClick={onClose}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col items-center px-6 lg:px-8 py-6 lg:py-6 gap-6 lg:gap-6 w-full max-w-[360px] lg:w-[448px] lg:max-w-none bg-white rounded-2xl shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 lg:top-5 right-6 lg:right-5 w-6 h-6 lg:w-6 lg:h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          aria-label="閉じる"
        >
          <XIcon size={20} color="#4A5565" />
        </button>

        <h2 className="text-xl lg:text-2xl font-medium lg:font-normal leading-7 lg:leading-8 tracking-[-0.439453px] lg:tracking-[0.0703125px] text-[#101828] w-full text-left lg:text-center">
          メンバー追加
        </h2>

        <div className="flex flex-col items-start w-full gap-4 lg:gap-4">
          <div className="flex flex-col items-start w-full gap-2 lg:gap-2">
            <label className="hidden lg:block text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
              役割
            </label>
            <div className="hidden lg:flex flex-row items-start w-full gap-10">
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={memberRole === 'member'}
                  onChange={(e) => setMemberRole(e.target.value as 'member' | 'introducer')}
                  className="w-5 h-5 border border-[#D1D5DC] rounded-full appearance-none checked:bg-[#155DFC] checked:border-[#155DFC] checked:ring-2 checked:ring-[#155DFC] checked:ring-offset-2"
                />
                <span className="text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828]">
                  メンバー
                </span>
              </label>
              <label className="flex flex-row items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="introducer"
                  checked={memberRole === 'introducer'}
                  onChange={(e) => setMemberRole(e.target.value as 'member' | 'introducer')}
                  className="w-5 h-5 border border-[#D1D5DC] rounded-full appearance-none checked:bg-[#155DFC] checked:border-[#155DFC] checked:ring-2 checked:ring-[#155DFC] checked:ring-offset-2"
                />
                <span className="text-base font-normal leading-5 tracking-[-0.3125px] text-[#101828]">
                  紹介者
                </span>
              </label>
            </div>

            <label className="lg:hidden text-sm font-medium leading-5 tracking-[-0.150391px] text-[#364153]">
              役割を選択
            </label>
            <div className="lg:hidden flex flex-col items-start w-full gap-2">
              <label className="flex flex-row items-center w-full px-3 py-4 gap-3 border border-[#E5E7EB] rounded-[10px] cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="role-mobile"
                  value="member"
                  checked={memberRole === 'member'}
                  onChange={(e) => setMemberRole(e.target.value as 'member' | 'introducer')}
                  className="w-4 h-4 border border-[#D1D5DC] rounded-full appearance-none checked:bg-[#155DFC] checked:border-[#155DFC] checked:ring-2 checked:ring-[#155DFC] checked:ring-offset-2"
                />
                <div className="flex flex-col gap-0">
                  <span className="text-base font-medium leading-6 tracking-[-0.3125px] text-[#101828]">
                    メンバー
                  </span>
                  <span className="text-xs font-medium leading-4 text-[#6A7282]">
                    書類の閲覧と編集が可能
                  </span>
                </div>
              </label>
              <label className="flex flex-row items-center w-full px-3 py-4 gap-3 border border-[#E5E7EB] rounded-[10px] cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="role-mobile"
                  value="introducer"
                  checked={memberRole === 'introducer'}
                  onChange={(e) => setMemberRole(e.target.value as 'member' | 'introducer')}
                  className="w-4 h-4 border border-[#D1D5DC] rounded-full appearance-none checked:bg-[#155DFC] checked:border-[#155DFC] checked:ring-2 checked:ring-[#155DFC] checked:ring-offset-2"
                />
                <div className="flex flex-col gap-0">
                  <span className="text-base font-medium leading-6 tracking-[-0.3125px] text-[#101828]">
                    紹介者
                  </span>
                  <span className="text-xs font-medium leading-4 text-[#6A7282]">閲覧のみ可能</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col items-start w-full gap-2 lg:gap-2">
            <label className="text-sm lg:text-sm font-normal lg:font-normal leading-5 lg:leading-5 tracking-[-0.150391px] text-[#4A5565]">
              メールアドレス
            </label>
            <div className="relative w-full">
              <MailIcon
                size={20}
                color="#99A1AF"
                className="absolute left-3 lg:left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-10 lg:pl-10 pr-4 lg:pr-4 py-3 lg:py-3 text-base lg:text-base font-normal leading-5 lg:leading-5 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[#0A0A0A]/50 bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const email = memberEmail.trim();
              if (!email) {
                alert('メールアドレスを入力してください');
                return;
              }
              try {
                const res = await fetch(`/api/cases/${caseId}/invite/email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, role: memberRole }),
                });
                if (res.ok) {
                  onSuccess?.();
                  onClose();
                } else {
                  const data = await res.json().catch(() => ({}));
                  const msg = data.detail
                    ? `${data.error}\n\n${data.detail}`
                    : (data.error || '招待の登録に失敗しました');
                  alert(msg);
                }
              } catch (e) {
                console.error('Invite email error:', e);
                alert('招待の登録に失敗しました');
              }
            }}
            className="w-full px-4 lg:px-4 py-3 lg:py-3 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors"
          >
            <span className="text-base lg:text-base font-normal leading-6 lg:leading-6 tracking-[-0.3125px] text-white">
              追加する
            </span>
          </button>

          <div className="flex flex-row items-center w-full gap-4 lg:gap-4">
            <div className="flex-grow h-px bg-[#D1D5DC]"></div>
            <span className="text-sm lg:text-sm font-normal leading-5 lg:leading-5 tracking-[-0.150391px] text-[#6A7282] bg-white px-2">
              または
            </span>
            <div className="flex-grow h-px bg-[#D1D5DC]"></div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setInviteLinkLoading(true);
              setInviteLinkCopied(false);
              try {
                const res = await fetch(`/api/cases/${caseId}/invite`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: memberRole }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const url = memberEmail.trim()
                    ? `${data.url}&email=${encodeURIComponent(memberEmail.trim())}`
                    : data.url;
                  await navigator.clipboard.writeText(url);
                  setInviteLinkCopied(true);
                  setTimeout(() => setInviteLinkCopied(false), 3000);
                  onSuccess?.();
                } else {
                  alert('招待リンクの生成に失敗しました');
                }
              } catch (e) {
                console.error('Invite link error:', e);
                alert('招待リンクの生成に失敗しました');
              } finally {
                setInviteLinkLoading(false);
              }
            }}
            disabled={inviteLinkLoading}
            className="w-full px-4 lg:px-4 py-3 lg:py-3 bg-[#4A5565] border border-[#E5E7EB] rounded-[10px] hover:bg-[#364153] transition-colors flex flex-row items-center justify-center gap-2 lg:gap-2 disabled:opacity-50"
          >
            <LinkIcon size={20} color="#FFFFFF" />
            <span className="text-base lg:text-base font-normal leading-6 lg:leading-6 tracking-[-0.3125px] text-white">
              {inviteLinkLoading ? '生成中...' : inviteLinkCopied ? 'コピーしました！' : '招待リンクコピー'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('todo');
  const [messageText, setMessageText] = useState('');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  
  // DB data states
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(defaultProjectInfo);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [flowSteps, setFlowSteps] = useState<Step[]>([]);
  const [stepsLoaded, setStepsLoaded] = useState(false); // API 호출 완료 여부 추적
  const [loading, setLoading] = useState(true);
  const [taskActionLoading, setTaskActionLoading] = useState<number | null>(null);
  // Form modal (form_input task)
  const [formModalTaskId, setFormModalTaskId] = useState<number | null>(null);
  const [taskAttachments, setTaskAttachments] = useState<Record<number, { id: number | string; file_name: string; file_path: string; file_size: number; uploaded_at: string; source?: 'task_attachment' | 'document'; uploaded_by_me?: boolean }[]>>({});
  const [uploadLoading, setUploadLoading] = useState<number | null>(null);
  const [confirmDocsTaskId, setConfirmDocsTaskId] = useState<number | null>(null);
  const [confirmDocsMode, setConfirmDocsMode] = useState<'expert' | 'mine' | null>(null);
  // Form modal state
  const [formQuestions, setFormQuestions] = useState<{ id: number; question_text: string; input_type: string; options: string[] | null; is_required: boolean }[]>([]);
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});
  const [formTaskTitle, setFormTaskTitle] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  
  // 専門家に却下された案件か（直接URLで開いた場合に表示）
  const [caseRejected, setCaseRejected] = useState(false);
  const [jGrantsSubmitting, setJGrantsSubmitting] = useState(false);
  const [jGrantsResult, setJGrantsResult] = useState<string | null>(null);
  
  // ヒアリングデータ（APIから取得。専門家が送ったテンプレートの質問のみ表示）
  const [hearingData, setHearingData] = useState<HearingFormData | null>(null);

  // メッセージ（APIから取得。顧客・専門家のやり取り）
  type CaseMessage = {
    id: number;
    sender_name: string;
    sender_initial: string;
    is_expert: boolean;
    is_mine?: boolean;
    content: string;
    created_at: string;
    attachments?: { id: number; file_name: string; file_path: string; file_size: string | null }[];
  };
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>([]);
  const [caseMessagesLoading, setCaseMessagesLoading] = useState(false);
  const [caseMessagesSending, setCaseMessagesSending] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messageAttachment, setMessageAttachment] = useState<File | null>(null);
  const [messagePreviewUrl, setMessagePreviewUrl] = useState<string | null>(null);
  const messageFileInputRef = useRef<HTMLInputElement>(null);

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

  // 書類管理データ（APIから取得）
  type DbDocument = {
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
    // NEWバッジ用フラグ（APIの is_new）
    is_new?: boolean;
  };
  const [dbDocuments, setDbDocuments] = useState<DbDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docUploading, setDocUploading] = useState<number | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetDocId, setUploadTargetDocId] = useState<number | null>(null);

  // 専門家共有書類の NEW フラグを「ファイルを表示」クリック時に既読にする
  const handleExpertSharedDocOpen = async (docId: number) => {
    setDbDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, is_new: false } : d))
    );
    try {
      await fetch(`/api/cases/${id}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_new: false }),
      });
    } catch (e) {
      console.error('Failed to clear expert-shared doc NEW flag (dashboard):', e);
    }
  };

  // メンバー一覧（APIから取得。case_members + 未使用の email_invites）
  type CaseMemberRow = {
    id: string | number;
    type: 'member' | 'invite';
    name: string;
    role: 'applicant' | 'introducer' | 'member';
    roleText: string;
    roleBgColor: string;
    roleBorderColor: string;
    roleTextColor: string;
    canDelete: boolean;
  };
  const [caseMembers, setCaseMembers] = useState<CaseMemberRow[]>([]);
  const [caseMembersLoading, setCaseMembersLoading] = useState(false);
  const [caseMembersIsApplicant, setCaseMembersIsApplicant] = useState(false);
  const fetchCaseMembers = useCallback(async () => {
    try {
      setCaseMembersLoading(true);
      const res = await fetch(`/api/cases/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setCaseMembersIsApplicant(!!data.isApplicant);
        const list = (data.members ?? []).map((m: { id: string | number; type: string; name: string; role: string; canDelete: boolean }) => {
          const style = MEMBER_ROLE_STYLE[m.role as keyof typeof MEMBER_ROLE_STYLE] ?? MEMBER_ROLE_STYLE.member;
          return {
            id: m.id,
            type: m.type as 'member' | 'invite',
            name: m.name,
            role: (m.role === 'applicant' ? 'applicant' : m.role === 'introducer' ? 'introducer' : 'member') as 'applicant' | 'introducer' | 'member',
            roleText: style.roleText,
            roleBgColor: style.bg,
            roleBorderColor: style.border,
            roleTextColor: style.text,
            canDelete: m.canDelete,
          };
        });
        setCaseMembers(list);
      }
    } catch (e) {
      console.error('Error fetching members:', e);
    } finally {
      setCaseMembersLoading(false);
    }
  }, [id]);

  // 書類一覧を再取得する関数
  const fetchDocuments = useCallback(async () => {
    try {
      setDocsLoading(true);
      const res = await fetch(`/api/cases/${id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDbDocuments(data.documents ?? []);
      }
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setDocsLoading(false);
    }
  }, [id]);

  // 書類タブに切り替えたら一覧を再取得（タスクでアップロード直後も反映）
  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments]);

  // メッセージ一覧を取得する関数（未読数も更新）。silent: true のときはローディング表示せず、差分があるときだけ state 更新（リラン防止）
  const fetchCaseMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setCaseMessagesLoading(true);
      const res = await fetch(`/api/cases/${id}/messages`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const next = Array.isArray(data.messages) ? data.messages : [];
        if (typeof data.unread_count === 'number') setUnreadMessageCount(data.unread_count);
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
  }, [id]);

  // 未読メッセージ数のみ取得（タブバッジ用）
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${id}/messages/unread`);
      if (res.ok) {
        const data = await res.json();
        setUnreadMessageCount(data.unread_count ?? 0);
      }
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  }, [id]);

  // メッセージを既読にする
  const markMessagesRead = useCallback(async () => {
    try {
      await fetch(`/api/cases/${id}/messages/read`, { method: 'POST' });
      setUnreadMessageCount(0);
    } catch (e) {
      console.error('Error marking messages read:', e);
    }
  }, [id]);

  // メッセージ送信（テキストまたはファイルのどちらかがあれば送信可）
  const handleSendMessage = useCallback(async () => {
    const text = messageText.trim();
    if ((!text && !messageAttachment) || caseMessagesSending) return;
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
        res = await fetch(`/api/cases/${id}/messages`, { method: 'POST', body: formData });
      } else {
        res = await fetch(`/api/cases/${id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
      }
      if (res.ok) {
        setMessageText('');
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
  }, [id, messageText, messageAttachment, caseMessagesSending, fetchCaseMessages]);

  // 書類アップロード処理
  const handleDocUpload = useCallback(async (docId: number, file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    setDocUploading(docId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/cases/${id}/documents/${docId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`アップロードに失敗しました: ${err.error || res.statusText}`);
        return;
      }
      // Refresh document list
      await fetchDocuments();
    } catch (e) {
      console.error('Upload error:', e);
      alert('アップロードに失敗しました');
    } finally {
      setDocUploading(null);
      setUploadTargetDocId(null);
    }
  }, [id, fetchDocuments]);

  // Drag & Drop upload for documents (not_submitted / rejected)
  const handleDocDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDocDrop = (docId: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleDocUpload(docId, file);
  };

  useEffect(() => {
    let cancelled = false;
    setCaseRejected(false);
    async function loadData() {
      setLoading(true);
      try {
        const REQUEST_TIMEOUT_MS = 20000;
        const withTimeout = <T,>(p: Promise<T>): Promise<T | null> =>
          Promise.race([
            p,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), REQUEST_TIMEOUT_MS)),
          ]);

        // 案件が却下されている場合は 403 + code: 'case_rejected' が返る
        const caseRes = await fetch(`/api/cases/${id}`);
        if (caseRes.status === 403) {
          const errBody = await caseRes.json().catch(() => ({}));
          if (errBody.code === 'case_rejected' && !cancelled) {
            setCaseRejected(true);
            setLoading(false);
            return;
          }
        }
        const caseSummary = caseRes.ok ? await caseRes.json() : null;

        const [tasks, docsRes, stepsRes] = await Promise.all([
          withTimeout(fetchCaseTasks(id).catch(() => null)),
          withTimeout(fetch(`/api/cases/${id}/documents`).then((r) => (r.ok ? r.json() : null)).catch(() => null)),
          withTimeout(fetch(`/api/cases/${id}/steps`).then((r) => (r.ok ? r.json() : null)).catch(() => null)),
        ]);

        if (cancelled) return;
        if (caseSummary && typeof caseSummary === 'object') {
          setProjectInfo({
            title: caseSummary.title ?? defaultProjectInfo.title,
            status: caseSummary.status ?? defaultProjectInfo.status,
            needsAction: caseSummary.needsAction ?? defaultProjectInfo.needsAction,
            location: caseSummary.location ?? defaultProjectInfo.location,
            deadline: caseSummary.deadline ?? defaultProjectInfo.deadline,
            assignee: caseSummary.assignee ?? defaultProjectInfo.assignee,
            amount: caseSummary.amount ?? defaultProjectInfo.amount,
            progress: typeof caseSummary.progress === 'number' ? caseSummary.progress : defaultProjectInfo.progress,
            customerName: caseSummary.customerName,
            companyName: caseSummary.companyName,
          });
        }
        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
          setChecklistItems(tasks);
        }
        // ユーザー側ヒアリングタブ非表示のためヒアリングデータは取得しない
        // if (hearingRes?.questions?.length) {
        //   setHearingData({ ... });
        // } else {
        setHearingData(null);
        // }
        if (docsRes?.documents?.length) {
          setDbDocuments(docsRes.documents);
        }
        // steps API 호출 완료 표시 (성공/실패 관계없이)
        setStepsLoaded(true);
        if (stepsRes?.steps?.length) {
          const mapped: Step[] = stepsRes.steps.map((s: { step_order: number; title: string; subtitle: string; description?: string; estimated_days?: number | null; status: string }) => {
            const status: Step['status'] = s.status === 'completed' ? 'completed' : s.status === 'in_progress' ? 'in-progress' : 'not-started';
            const isCompleted = status === 'completed';
            const isProgress = status === 'in-progress';
            const estimate = s.estimated_days != null ? `目安: ${s.estimated_days}日` : '目安: 数日';
            return {
              id: s.step_order,
              title: s.title,
              subtitle: s.subtitle ?? '',
              description: s.description ?? '',
              estimate,
              status,
              iconColor: isCompleted ? '#00C950' : isProgress ? '#2B7FFF' : '#99A1AF',
              borderColor: isCompleted ? '#B9F8CF' : isProgress ? '#2B7FFF' : '#E5E7EB',
              hasShadow: isProgress,
            };
          });
          setFlowSteps(mapped);
        } else {
          // API 호출は 성공したがデータが無い場合は空配列
          setFlowSteps([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading case data:', error);
          setStepsLoaded(true);
          setFlowSteps([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'todo') return;
    checklistItems.forEach((item) => fetchTaskAttachments(item.id));
  }, [activeTab, checklistItems.length]);

  // Load form when form modal opens
  useEffect(() => {
    if (formModalTaskId == null) return;
    let cancelled = false;
    setFormLoading(true);
    setFormAnswers({});
    fetch(`/api/tasks/${formModalTaskId}/form`)
      .then((res) => {
        if (!res.ok) throw new Error('フォームの読み込みに失敗しました。');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFormTaskTitle(data.task?.title ?? 'フォーム');
        setFormQuestions(data.questions ?? []);
        const initial: Record<string, string> = {};
        (data.questions ?? []).forEach((q: { id: number }) => {
          const v = data.answers?.[q.id];
          initial[String(q.id)] = v != null ? String(v) : '';
        });
        setFormAnswers(initial);
      })
      .catch(() => {
        if (!cancelled) setFormQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setFormLoading(false);
      });
    return () => { cancelled = true; };
  }, [formModalTaskId]);

  // メッセージタブ表示時に一覧を取得し、既読にする
  useEffect(() => {
    if (activeTab === 'messages') {
      fetchCaseMessages().then(() => markMessagesRead());
    }
  }, [activeTab, fetchCaseMessages, markMessagesRead]);

  // メッセージのRealtime購読（タブ表示中のみ。新着で一覧を再取得）
  useEffect(() => {
    if (activeTab !== 'messages' || !id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `case_id=eq.${id}` },
        () => {
          fetchCaseMessages();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, id, fetchCaseMessages]);

  // メッセージの定期再取得（Realtimeが有効でない場合のフォールバック。タブ表示中のみ。silent でリラン防止）
  useEffect(() => {
    if (activeTab !== 'messages' || !id) return;
    const interval = setInterval(() => {
      fetchCaseMessages(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, id, fetchCaseMessages]);

  // Presence: 専門家画面で「オンライン」表示するため、案件ページ表示中は顧客として参加
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:case-${id}`);
    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await channel.track({ user_id: session.user.id, role: 'customer' });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // 案件表示時に未読数を取得（タブバッジ用）
  useEffect(() => {
    fetchUnreadCount();
  }, [id, fetchUnreadCount]);

  // メンバータブ表示時に一覧を取得
  useEffect(() => {
    if (activeTab === 'members') fetchCaseMembers();
  }, [activeTab, fetchCaseMembers]);

  const handleFormSave = async (submit: boolean) => {
    if (formModalTaskId == null) return;
    setFormSaving(true);
    try {
      const res = await fetch(`/api/tasks/${formModalTaskId}/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formAnswers, submit }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '保存に失敗しました');
        return;
      }
      if (submit) {
        setFormModalTaskId(null);
        await reloadTasks();
      } else {
        alert('保存しました');
      }
    } finally {
      setFormSaving(false);
    }
  };

  // ESC key to close modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (formModalTaskId != null) setFormModalTaskId(null);
      else if (confirmDocsTaskId != null) {
        setConfirmDocsTaskId(null);
        setConfirmDocsMode(null);
      } else setIsAddMemberModalOpen(false);
    }
  };

  // Handle hearing form submission
  const handleHearingSubmit = async (responses: Record<string, string | string[]>) => {
    try {
      const res = await fetch(`/api/cases/${id}/hearing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, status: 'submitted' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存に失敗しました');
      }
      setHearingData(prev => prev ? {
        ...prev,
        responses,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      } : null);
    } catch (err) {
      console.error('Hearing submit error:', err);
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  // Handle hearing form draft save
  const handleHearingSaveDraft = async (responses: Record<string, string | string[]>) => {
    try {
      const res = await fetch(`/api/cases/${id}/hearing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, status: 'draft' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '下書きの保存に失敗しました');
      }
      setHearingData(prev => prev ? {
        ...prev,
        responses,
        status: 'draft',
      } : null);
      alert('一時保存しました');
    } catch (err) {
      console.error('Hearing draft save error:', err);
      alert(err instanceof Error ? err.message : '下書きの保存に失敗しました');
    }
  };

  // Reload tasks after action
  const reloadTasks = async () => {
    const tasks = await fetchCaseTasks(id);
    if (tasks.length > 0) {
      setChecklistItems(tasks);
    }
  };

  // Handle task toggle
  const handleTaskToggle = async (taskId: number, currentStatus: boolean) => {
    setTaskActionLoading(taskId);
    try {
      const success = await toggleTaskStatus(taskId, !currentStatus);
      if (success) {
        await reloadTasks();
      }
    } finally {
      setTaskActionLoading(null);
    }
  };

  // Handle task submit
  const handleTaskSubmit = async (taskId: number) => {
    setTaskActionLoading(taskId);
    try {
      const success = await submitTask(taskId);
      if (success) {
        await reloadTasks();
      }
    } finally {
      setTaskActionLoading(null);
    }
  };

  // Mark task NEW flag as read when user clicks the task card
  const handleTaskCardClick = async (item: ChecklistItem) => {
    if (!item.is_new) return;
    setChecklistItems((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, is_new: false } : t))
    );
    try {
      await fetch(`/api/tasks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_new: false }),
      });
    } catch (e) {
      console.error('Failed to clear task NEW flag:', e);
    }
  };

  // Fetch attachments for file_upload task
  const fetchTaskAttachments = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      if (!res.ok) return;
      const json = await res.json();
      setTaskAttachments(prev => ({ ...prev, [taskId]: json.attachments ?? [] }));
    } catch (e) {
      console.error('Fetch attachments error:', e);
    }
  };

  // Upload file for file_upload task
  const handleTaskFileUpload = async (taskId: number, file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    setUploadLoading(taskId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tasks/${taskId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'アップロードに失敗しました');
        return;
      }
      await fetchTaskAttachments(taskId);
    } finally {
      setUploadLoading(null);
    }
  };

  // Calculate completed tasks
  const completedTasks = checklistItems.filter(item => item.completed).length;
  const totalTasks = checklistItems.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
        <Sidebar activeItem="cases" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#155DFC]"></div>
            <p className="mt-4 text-[#4A5565]">読み込み中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <Sidebar activeItem="cases" />

      {/* Main Content */}
      <main className="flex flex-col items-start flex-grow min-w-0 pb-16 lg:pb-0 lg:overflow-y-auto lg:h-screen">
        {/* Header */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-6 pb-[0.5px] lg:py-6 gap-0 lg:gap-3 w-full bg-white border-b border-[#E5E7EB]">
          {/* 却下された案件：メッセージ表示と一覧へ戻る */}
          {caseRejected && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="max-w-md flex flex-col gap-4">
                <p className="text-lg font-medium text-[#101828]">この案件は却下されました。</p>
                <p className="text-sm text-[#6A7282]">担当者により却下されたため、この案件の内容を表示できません。</p>
                <Link
                  href="/dashboard/cases"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#155DFC] text-white rounded-lg hover:bg-[#1248C4] transition-colors text-sm font-medium"
                >
                  <ArrowLeftIcon size={18} color="#FFFFFF" />
                  案件一覧に戻る
                </Link>
              </div>
            </div>
          )}

          {/* Back Button */}
          {!caseRejected && (
          <Link
            href="/dashboard/cases"
            className="flex flex-row items-center gap-2 h-5 lg:h-6 hover:opacity-70 transition-opacity"
          >
            <ArrowLeftIcon size={16} color="#4A5565" className="lg:w-5 lg:h-5" />
            <span className="text-sm font-medium lg:font-normal lg:text-base text-[#4A5565] leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px]">
              案件一覧に戻る
            </span>
          </Link>
          )}

          {!caseRejected && (
          <>
          {/* Project Info */}
          <div className="flex flex-col gap-3 lg:gap-3 w-full pt-4 lg:pt-0">
            {/* Status Badges */}
            <div className="flex flex-row items-center gap-2">
              <span className="py-0.5 lg:px-3 lg:py-1 bg-transparent lg:bg-[#F3F4F6] rounded-full text-xs lg:text-sm text-[#6A7282] lg:text-[#364153] leading-4 lg:leading-5">
                {projectInfo.status}
              </span>
              {projectInfo.needsAction && (
                <span className="px-2 py-0.5 lg:px-3 lg:py-1 bg-[#FEE2E2] rounded-full text-xs lg:text-sm text-[#DC2626] lg:text-[#C10007] leading-4 lg:leading-5 flex items-center gap-1">
                  <Image 
                    src="/icons/exclamation.svg" 
                    alt="warning" 
                    width={12} 
                    height={12} 
                    className="w-3 h-3"
                  />
                  <span>対応必要</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl lg:text-xl font-medium leading-7 tracking-[-0.449219px] text-[#101828]">
              {projectInfo.title}
            </h1>

            {/* Details */}
            <div className="flex flex-col gap-3 lg:gap-3 w-full">
              {/* Row 1: Location + Deadline (same line on mobile) */}
              <div className="flex flex-row items-center gap-3 flex-wrap">
                <div className="flex flex-row items-center gap-1">
                  <LocationIcon size={16} color="#4A5565" />
                  <span className="text-xs lg:text-sm text-[#4A5565] leading-4 lg:leading-5">
                    {projectInfo.location}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-1">
                  <CalendarIcon size={16} color="#4A5565" />
                  <span className="text-xs lg:text-sm text-[#4A5565] leading-4 lg:leading-5">
                    締切: {projectInfo.deadline}
                  </span>
                </div>
              </div>
              {/* Row 2: Assignee */}
              <div className="flex flex-row items-center gap-1">
                <UserIcon size={16} color="#4A5565" />
                <span className="text-xs lg:text-sm text-[#4A5565] leading-4 lg:leading-5">
                  {projectInfo.assignee}
                </span>
              </div>
            </div>

            {/* Amount and Progress */}
            <div className="flex flex-row justify-between items-start w-full pt-0 lg:pt-3 border-t border-[#E5E7EB] pb-4 lg:pb-0">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs text-[#6A7282] leading-4">支援金額</span>
                <span className="text-xl lg:text-2xl font-medium leading-7 lg:leading-8 tracking-[-0.449219px] lg:tracking-[0.0703125px] text-[#155DFC]">
                  {projectInfo.amount}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-[#6A7282] leading-4 text-right">進捗率</span>
                <span className="text-xl lg:text-2xl font-medium leading-7 lg:leading-8 tracking-[-0.449219px] lg:tracking-[0.0703125px] text-[#00A63E] text-right">
                  {taskProgress}%
                </span>
              </div>
            </div>
          </div>
          </>)}
        </div>

        {!caseRejected && (
        <>
        {/* Tabs */}
        <div className="flex flex-row items-end px-4 lg:px-6 gap-0 w-full bg-white border-b border-[#E5E7EB] overflow-x-auto flex-shrink-0">
          {[
            { id: 'flow', label: '申請フロー' },
            // ユーザー側ヒアリングタブは非表示（専門家が /expert/management/[id]/[caseId] の「回答を確認」で申込時ヒアリングを確認）
            // {
            //   id: 'hearing',
            //   label: 'ヒアリング',
            //   badge: (() => {
            //     const count = hearingData?.expertAddedQuestionCount ?? 0;
            //     if (count > 0) return String(count);
            //     if (hearingData?.status === 'pending') return '未回答';
            //     return '';
            //   })(),
            //   badgeColor: hearingData?.status === 'pending' ? 'red' : 'blue',
            // },
            { id: 'todo', label: 'タスク', badge: `${completedTasks}/${totalTasks}` },
            { id: 'documents', label: '書類管理' },
            {
              id: 'messages',
              label: 'メッセージ',
              badge: unreadMessageCount > 0 ? String(unreadMessageCount) : undefined,
              badgeColor: 'red',
            },
            { id: 'members', label: 'メンバーリスト' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-row items-center px-4 lg:px-4 py-3 lg:py-4 gap-2 transition-colors flex-shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#155DFC] -mb-[1px]'
                  : 'border-b-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <span
                className={`text-sm leading-5 tracking-[-0.150391px] text-center ${
                  activeTab === tab.id ? 'text-[#155DFC]' : 'text-[#4A5565]'
                }`}
              >
                {tab.label}
              </span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs leading-4 text-center ${
                    tab.badgeColor === 'red'
                      ? 'bg-[#FB2C36] text-white'
                      : 'bg-[#DBEAFE] text-[#155DFC]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className={`flex flex-col items-start w-full ${
            activeTab === 'messages' || activeTab === 'members'
              ? 'p-0 lg:p-0 flex-grow bg-white'
              : 'px-4 lg:px-6 py-6 lg:py-6 gap-6 lg:gap-6 flex-grow'
          }`}
        >
          {/* ユーザー側ヒアリングタブは非表示（専門家が「回答を確認」で /hearing 申込内容を確認） */}
          {/* {activeTab === 'hearing' && (
            <div className="flex flex-col items-start p-4 lg:p-6 gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
              <HearingTab
                hearingData={hearingData}
                onSubmit={handleHearingSubmit}
                onSaveDraft={handleHearingSaveDraft}
              />
            </div>
          )} */}

          {/* Flow Tab */}
          {activeTab === 'flow' && (
            <>
              <div className="flex flex-col items-start px-4 lg:px-6 py-4 lg:py-3 gap-2 w-full bg-[#EFF6FF] border border-[#BFDBFE] lg:border-[#BEDBFF] rounded-[10px] lg:rounded-[14px]">
                <p className="text-xs lg:text-base text-[#1E40AF] lg:text-[#193CB8] leading-4 lg:leading-6 tracking-[-0.3125px]">
                  補助金申請の流れを示す8つのステップでご案内します。各ステップの詳細と必要な作業をご確認ください。
                </p>
              </div>
              <div className="flex flex-col items-start px-4 lg:px-6 py-4 gap-3 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
                <h3 className="text-sm lg:text-base font-medium text-[#101828]">jGrants申請</h3>
                <button
                  onClick={async () => {
                    setJGrantsSubmitting(true);
                    setJGrantsResult(null);
                    try {
                      const res = await fetch('https://n8n.srv1284240.hstgr.cloud/webhook/48117fc2-d0ee-4194-a21e-c83df1fb5b6c', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ case_id: parseInt(id) }),
                      });
                      if (res.ok) {
                        setJGrantsResult('success');
                      } else {
                        setJGrantsResult('error');
                      }
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
              <div className="flex flex-col gap-4 lg:gap-5 w-full relative">
                <div className="hidden lg:block absolute left-[28.7px] top-[61.7px] bottom-0 w-0.5 bg-[#E5E7EB]"></div>

                {flowSteps.length === 0 && stepsLoaded ? (
                  <div className="flex flex-col items-center justify-center py-12 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
                    <p className="text-sm lg:text-base text-[#6A7282] lg:text-[#4A5565]">
                      ステップ情報がありません
                    </p>
                  </div>
                ) : (
                  (flowSteps.length > 0 ? flowSteps : steps).map((step) => (
                  <div
                    key={step.id}
                    className={`relative flex flex-col items-start p-4 lg:p-6 gap-3 lg:gap-3 w-full bg-white border-[1.7px] lg:border-2 rounded-[10px] lg:rounded-2xl ${
                      step.hasShadow ? 'shadow-lg' : ''
                    }`}
                    style={{ borderColor: step.borderColor }}
                  >
                    <div className="flex flex-row items-start gap-3 lg:gap-6 w-full">
                      <div
                        className="flex justify-center items-center w-10 h-10 lg:w-12 lg:h-12 rounded-full lg:rounded-2xl flex-shrink-0 relative z-10"
                        style={{ background: step.iconColor }}
                      >
                        {step.status === 'completed' ? (
                          <Image src="/icons/check.svg" alt="Completed" width={32} height={32} className="w-8 h-8 lg:w-10 lg:h-10" />
                        ) : step.status === 'in-progress' ? (
                          <Image src="/icons/point.svg" alt="In Progress" width={32} height={32} className="w-8 h-8 lg:w-10 lg:h-10" />
                        ) : (
                          <Image src="/icons/greyround.svg" alt="Not Started" width={32} height={32} className="w-8 h-8 lg:w-10 lg:h-10" />
                        )}
                      </div>

                      <div className="flex flex-col gap-2 lg:gap-3 flex-grow">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 lg:gap-2.5">
                          <h3 className="text-sm lg:text-2xl font-medium lg:font-normal leading-5 lg:leading-8 tracking-[-0.150391px] lg:tracking-[0.0703125px] text-[#0A0A0A] lg:text-[#101828]">
                            {step.id}. {step.title}
                          </h3>
                          {/* Desktop: Status/Deadline Row */}
                          <div className="hidden lg:flex flex-row items-center gap-2">
                            <ClockIcon size={12} color="#6A7282" className="lg:w-5 lg:h-5" />
                            <span className="text-xs lg:text-base text-[#6A7282] lg:text-[#4A5565] leading-4 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px]">
                              {step.estimate}
                            </span>
                            <span
                              className={`px-4 py-1 lg:px-5 lg:py-2 rounded-full text-xs lg:text-base leading-4 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] w-fit ${
                                step.status === 'completed'
                                  ? 'bg-[#DCFCE7] text-[#008236]'
                                  : step.status === 'in-progress'
                                  ? 'bg-[#DBEAFE] text-[#1E40AF] lg:text-[#1447E6]'
                                  : 'bg-[#F3F4F6] text-[#4B5563] lg:text-[#364153]'
                              }`}
                            >
                              {step.status === 'completed'
                                ? '完了'
                                : step.status === 'in-progress'
                                ? '進行中'
                                : '未着手'}
                            </span>
                          </div>
                        </div>

                        {/* Mobile: Subtitle first, then Status/Deadline */}
                        <div className="lg:hidden flex flex-col gap-2">
                          <span className="text-xs text-[#6A7282] leading-4 tracking-[-0.150391px]">
                            {step.subtitle}
                          </span>
                          <div className="flex flex-row items-center gap-2">
                            <ClockIcon size={12} color="#6A7282" />
                            <span className="text-xs text-[#6A7282] leading-4 tracking-[-0.150391px]">
                              {step.estimate}
                            </span>
                            <span
                              className={`px-4 py-1 rounded-full text-xs leading-4 tracking-[-0.150391px] w-fit ${
                                step.status === 'completed'
                                  ? 'bg-[#DCFCE7] text-[#008236]'
                                  : step.status === 'in-progress'
                                  ? 'bg-[#DBEAFE] text-[#1E40AF]'
                                  : 'bg-[#F3F4F6] text-[#4B5563]'
                              }`}
                            >
                              {step.status === 'completed'
                                ? '完了'
                                : step.status === 'in-progress'
                                ? '進行中'
                                : '未着手'}
                            </span>
                          </div>
                        </div>

                        {/* Desktop: Subtitle */}
                        <div className="hidden lg:flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-2">
                          <span className="text-xs lg:text-base text-[#6A7282] lg:text-[#4A5565] leading-4 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px]">
                            {step.subtitle}
                          </span>
                        </div>

                        <p className="text-xs lg:text-base leading-5 lg:leading-[26px] tracking-[-0.3125px] text-[#6A7282] lg:text-[#364153]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Documents Tab - Figma: single-column card list */}
          {activeTab === 'documents' && (
            <>
              {/* Hidden file input for document uploads */}
              <input
                ref={docFileInputRef}
                type="file"
                className="hidden"
                accept={getAcceptAttribute()}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && uploadTargetDocId != null) {
                    handleDocUpload(uploadTargetDocId, file);
                  }
                  e.target.value = '';
                }}
              />

              {/* Info banner */}
              <div className="flex flex-col items-start px-4 lg:px-6 py-4 lg:py-6 gap-2 lg:gap-2 w-full bg-[#EFF6FF] border border-[#BFDBFE] lg:border-[#BEDBFF] rounded-[10px] lg:rounded-[14px]">
                <h2 className="text-base lg:text-lg font-medium leading-6 lg:leading-7 tracking-[-0.3125px] lg:tracking-[-0.439453px] text-[#1C398E]">
                  書類アップロード・管理
                </h2>
                <p className="text-xs lg:text-sm text-[#193CB8] leading-4 lg:leading-5 tracking-[-0.150391px]">
                  必要な書類をアップロードし、行政書士の確認を受けてください。差戻しがあった場合はコメントを確認して再提出してください。
                </p>
              </div>

              {docsLoading && dbDocuments.length === 0 ? (
                <div className="flex items-center justify-center py-12 w-full">
                  <span className="text-sm text-[#6A7282]">読み込み中...</span>
                </div>
              ) : dbDocuments.length === 0 ? (
                <div className="flex items-center justify-center py-12 w-full">
                  <span className="text-sm text-[#6A7282]">書類がありません</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6 lg:gap-8 w-full">
                  {/* 専門家から共有されたファイル */}
                  {dbDocuments.filter(d => d.is_expert_shared).length > 0 && (
                    <div className="flex flex-col gap-3 lg:gap-4 w-full">
                      <h3 className="text-sm lg:text-base font-medium text-[#4A5565]">専門家からの共有ファイル</h3>
                      {dbDocuments.filter(d => d.is_expert_shared).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col items-start p-4 lg:p-4 gap-3 lg:gap-3 w-full bg-white border-[1.7px] lg:border-2 rounded-[10px] lg:rounded-[14px]"
                          style={{ borderColor: '#E5E7EB' }}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 w-full">
                            <div className="flex flex-row items-center gap-2 flex-wrap">
                              <h3 className="text-base lg:text-lg font-medium leading-6 lg:leading-7 tracking-[-0.3125px] lg:tracking-[-0.439453px] text-[#0A0A0A] lg:text-[#101828]">
                                {doc.title}
                              </h3>
                              {doc.is_new && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6]">
                                  NEW
                                </span>
                              )}
                            </div>
                            {doc.file_path && (
                              <a
                                href={`/api/cases/${id}/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-row items-center gap-2 px-4 py-2 bg-[#F3F4F6] rounded-[10px] hover:bg-[#E5E7EB] transition-colors flex-shrink-0"
                                onClick={() => {
                                  if (doc.is_new) {
                                    void handleExpertSharedDocOpen(doc.id);
                                  }
                                }}
                              >
                                <EyeIcon size={16} color="#364153" />
                                <span className="text-sm lg:text-base text-[#364153] leading-5 lg:leading-6">
                                  ファイルを表示
                                </span>
                              </a>
                            )}
                          </div>
                          {doc.uploaded_at && (
                            <p className="text-xs lg:text-sm text-[#4A5565] leading-4 lg:leading-5 tracking-[-0.150391px]">
                              共有日: {new Date(doc.uploaded_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 提出書類 */}
                  {dbDocuments.filter(d => !d.is_expert_shared).length > 0 && (
                    <div className="flex flex-col gap-3 lg:gap-4 w-full">
                      {dbDocuments.filter(d => d.is_expert_shared).length > 0 && (
                        <h3 className="text-sm lg:text-base font-medium text-[#4A5565]">提出書類</h3>
                      )}
                  {dbDocuments.filter(d => !d.is_expert_shared).map((doc) => {
                    const statusMap: Record<string, { text: string; bgColor: string; textColor: string; borderColor: string; cardBorder: string }> = {
                      not_submitted: { text: '未提出', bgColor: '#F3F4F6', textColor: '#364153', borderColor: '#E5E7EB', cardBorder: '#E5E7EB' },
                      submitted: { text: '確認中', bgColor: '#DBEAFE', textColor: '#1447E6', borderColor: '#BEDBFF', cardBorder: '#E5E7EB' },
                      reviewing: { text: '確認中', bgColor: '#DBEAFE', textColor: '#1447E6', borderColor: '#BEDBFF', cardBorder: '#E5E7EB' },
                      approved: { text: '承認済', bgColor: '#DCFCE7', textColor: '#008236', borderColor: '#B9F8CF', cardBorder: '#B9F8CF' },
                      rejected: { text: '差戻し', bgColor: '#FFE2E2', textColor: '#C10007', borderColor: '#FFC9C9', cardBorder: '#FFC9C9' },
                    };
                    const st = statusMap[doc.status] ?? statusMap.not_submitted;
                    const isUploading = docUploading === doc.id;

                    const isDroppable = doc.status === 'not_submitted' || doc.status === 'rejected';

                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col items-start p-4 lg:p-4 gap-3 lg:gap-3 w-full bg-white border-[1.7px] lg:border-2 rounded-[10px] lg:rounded-[14px]"
                        style={{ borderColor: st.cardBorder }}
                        onDragOver={isDroppable ? handleDocDragOver : undefined}
                        onDrop={isDroppable ? (event) => handleDocDrop(doc.id, event) : undefined}
                      >
                        {/* Row 1: Status + Title + Required badge + Action buttons */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 w-full">
                          <div className="flex flex-row items-center gap-2 lg:gap-3 flex-wrap">
                            <span
                              className="px-3 py-1.5 lg:py-1.5 rounded-full text-xs lg:text-sm leading-4 lg:leading-5 tracking-[-0.150391px] border-[0.57px] lg:border flex-shrink-0"
                              style={{ background: st.bgColor, color: st.textColor, borderColor: st.borderColor }}
                            >
                              {st.text}
                            </span>
                            <h3 className="text-base lg:text-lg font-medium leading-6 lg:leading-7 tracking-[-0.3125px] lg:tracking-[-0.439453px] text-[#0A0A0A] lg:text-[#101828]">
                              {doc.title}
                            </h3>
                            {doc.is_required && (
                              <span className="px-2 py-0.5 bg-[#FFE2E2] rounded text-xs text-[#C10007] leading-4 flex-shrink-0">
                                必須
                              </span>
                            )}
                          </div>
                          <div className="flex flex-row items-center gap-2 lg:gap-3 flex-shrink-0">
                            {/* 差戻し → 再アップロード */}
                            {doc.status === 'rejected' && (
                              <button
                                disabled={isUploading}
                                onClick={() => { setUploadTargetDocId(doc.id); docFileInputRef.current?.click(); }}
                                className="flex flex-row items-center gap-2 px-4 py-2 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors disabled:opacity-50"
                              >
                                <UploadIcon size={16} color="#FFFFFF" />
                                <span className="text-sm lg:text-base text-white leading-5 lg:leading-6">
                                  {isUploading ? 'アップロード中...' : '再アップロード'}
                                </span>
                              </button>
                            )}
                            {/* 未提出 → ファイルを選択 */}
                            {doc.status === 'not_submitted' && (
                              <button
                                disabled={isUploading}
                                onClick={() => { setUploadTargetDocId(doc.id); docFileInputRef.current?.click(); }}
                                className="flex flex-row items-center gap-2 px-4 py-2 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors disabled:opacity-50"
                              >
                                <UploadIcon size={16} color="#FFFFFF" />
                                <span className="text-sm lg:text-base text-white leading-5 lg:leading-6">
                                  {isUploading ? 'アップロード中...' : 'ファイルを選択'}
                                </span>
                              </button>
                            )}
                            {/* 確認中 → ファイルを表示のみ */}
                            {(doc.status === 'submitted' || doc.status === 'reviewing') && doc.file_path && (
                              <a
                                href={`/api/cases/${id}/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-row items-center gap-2 px-4 py-2 bg-[#F3F4F6] rounded-[10px] hover:bg-[#E5E7EB] transition-colors"
                              >
                                <EyeIcon size={16} color="#364153" />
                                <span className="text-sm lg:text-base text-[#364153] leading-5 lg:leading-6">
                                  ファイルを表示
                                </span>
                              </a>
                            )}
                            {/* 承認済 → ファイルを表示 */}
                            {doc.status === 'approved' && doc.file_path && (
                              <a
                                href={`/api/cases/${id}/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-row items-center gap-2 px-4 py-2 bg-[#F3F4F6] rounded-[10px] hover:bg-[#E5E7EB] transition-colors"
                              >
                                <EyeIcon size={16} color="#364153" />
                                <span className="text-sm lg:text-base text-[#364153] leading-5 lg:leading-6">
                                  ファイルを表示
                                </span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Template download area */}
                        {doc.has_template && doc.template_url && (
                          <div className="flex flex-col gap-2 lg:gap-2 w-full p-3 lg:p-3 bg-[#EFF6FF] border border-[#BFDBFE] lg:border-[#BEDBFF] rounded-[10px]">
                            <a
                              href={doc.template_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-row items-center gap-1 text-sm text-[#155DFC] leading-5 tracking-[-0.150391px] hover:underline w-fit"
                            >
                              <DownloadIcon size={16} color="#155DFC" />
                              <span>テンプレートをダウンロード</span>
                            </a>
                            <p className="text-xs lg:text-sm text-[#193CB8] leading-4 lg:leading-5 tracking-[-0.150391px]">
                              記入例とテンプレートをダウンロードして作成できます
                            </p>
                          </div>
                        )}

                        {/* Upload date */}
                        {doc.uploaded_at && (
                          <p className="text-xs lg:text-sm text-[#4A5565] leading-4 lg:leading-5 tracking-[-0.150391px]">
                            アップロード日: {new Date(doc.uploaded_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                          </p>
                        )}

                        {/* Expert comment (承認済・却下時) */}
                        {(doc.status === 'approved' || doc.status === 'rejected') && (doc.feedback || doc.expert_comment) && (
                          <div className={`flex flex-col items-start p-3 gap-2 w-full rounded-[10px] ${
                            doc.status === 'rejected' 
                              ? 'bg-[#FEF2F2] border border-[#FFC9C9]' 
                              : 'bg-[#EFF6FF] border border-[#BFDBFE]'
                          }`}>
                            <div className="flex flex-row items-start gap-2">
                              <div className={`flex justify-center items-center w-5 h-5 flex-shrink-0 rounded-full ${
                                doc.status === 'rejected' ? 'bg-[#FDEBEB]' : 'bg-[#DBEAFE]'
                              }`}>
                                {doc.status === 'rejected' ? (
                                  <Image src="/icons/exclamation.svg" alt="warning" width={16} height={16} className="w-4 h-4" />
                                ) : (
                                  <InfoIcon size={16} color="#1447E6" />
                                )}
                              </div>
                              <div className="flex flex-col gap-1 flex-grow">
                                <h4 className={`text-sm font-semibold leading-5 tracking-[-0.150391px] ${
                                  doc.status === 'rejected' ? 'text-[#82181A]' : 'text-[#1C398E]'
                                }`}>
                                  行政書士からのコメント
                                </h4>
                                <p className={`text-xs lg:text-sm leading-4 lg:leading-5 tracking-[-0.150391px] ${
                                  doc.status === 'rejected' ? 'text-[#9F0712]' : 'text-[#193CB8]'
                                }`}>
                                  {doc.feedback || doc.expert_comment}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Todo Tab */}
          {activeTab === 'todo' && (
            <>
              <div className="flex flex-col items-start p-4 lg:p-6 gap-2 lg:gap-4 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
                <div className="flex flex-row justify-between items-center w-full">
                  <div className="flex flex-col gap-1 lg:gap-1">
                    <h3 className="text-sm lg:text-xl font-medium leading-5 lg:leading-7 tracking-[-0.150391px] lg:tracking-[-0.449219px] text-[#0A0A0A] lg:text-[#101828]">
                      やることリスト進捗
                    </h3>
                    <p className="text-xs lg:text-sm text-[#6A7282] lg:text-[#4A5565] leading-4 lg:leading-5 tracking-[-0.150391px]">
                      完了: {completedTasks} / {totalTasks}項目
                    </p>
                  </div>
                  <span className="text-lg lg:text-[30px] font-semibold lg:font-medium leading-7 lg:leading-9 tracking-[-0.439453px] lg:tracking-[0.395508px] text-[#155DFC] text-right">
                    {taskProgress}%
                  </span>
                </div>
                <div className="w-full h-2 lg:h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#155DFC] rounded-full" style={{ width: `${taskProgress}%` }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:gap-4 w-full">
                {checklistItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 w-full bg-white border border-[#E5E7EB] rounded-[10px] lg:rounded-[14px]">
                    <p className="text-sm lg:text-base text-[#6A7282] lg:text-[#4A5565]">
                      {loading ? 'タスクを読み込み中...' : 'タスクがありません'}
                    </p>
                  </div>
                ) : (
                  <>
                    {checklistItems.map((item) => {
                  const isLoading = taskActionLoading === item.id;
                  const rawStatus = item.rawStatus || (item.completed ? 'approved' : 'pending');
                  const isRejected = rawStatus === 'rejected';
                  const isSubmitted = rawStatus === 'submitted';
                  const canSubmit = rawStatus === 'pending' || rawStatus === 'in_progress' || isRejected;
                  
                  // Status badge styles
                  const statusBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
                    pending: { bg: '#F3F4F6', text: '#364153', border: '#E5E7EB' },
                    in_progress: { bg: '#DBEAFE', text: '#1447E6', border: '#BEDBFF' },
                    submitted: { bg: '#DBEAFE', text: '#1447E6', border: '#BEDBFF' },
                    approved: { bg: '#DCFCE7', text: '#008236', border: '#B9F8CF' },
                    rejected: { bg: '#FFE2E2', text: '#C10007', border: '#FFC9C9' },
                  };
                  const badgeStyle = statusBadgeStyles[rawStatus] || statusBadgeStyles.pending;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col items-start p-4 lg:p-4 gap-3 lg:gap-3 w-full bg-white border-[1.7px] lg:border rounded-[10px] lg:rounded-[14px]"
                      style={{ borderColor: item.borderColor }}
                      onClick={() => handleTaskCardClick(item)}
                    >
                      <div className="flex flex-row items-start gap-3 lg:gap-3 w-full">
                        <div className="flex-shrink-0 pt-0.5 lg:pt-0">
                          <div
                            className={`flex justify-center items-center w-5 h-5 lg:w-6 lg:h-6 rounded border-[1.7px] lg:border-2 ${
                              item.completed
                                ? 'bg-[#10B981] border-[#10B981] lg:bg-[#00C950] lg:border-[#00C950]'
                                : 'bg-white border-[#D1D5DC]'
                            }`}
                            aria-hidden
                          >
                            {item.completed && (
                              <CheckIcon size={12} color="#FFFFFF" className="lg:w-4 lg:h-4" />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 lg:gap-2 flex-grow min-w-0 w-full">
                          <div className="flex flex-row items-center justify-between gap-2 flex-wrap w-full">
                            <div className="flex flex-row items-center gap-2 flex-wrap">
                              <h4
                                className={`text-sm lg:text-base font-medium leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] ${
                                  item.completed
                                    ? 'line-through text-[#10B981] lg:text-[#101828]'
                                    : 'text-[#0A0A0A] lg:text-[#101828]'
                                }`}
                              >
                                {item.title}
                              </h4>
                              {item.is_new && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-[#DBEAFE] text-[#1447E6]">
                                  NEW
                                </span>
                              )}
                              {item.required && (
                                <span className="px-2 py-0.5 bg-[#FFE2E2] rounded text-xs text-[#C10007] leading-4">
                                  必須
                                </span>
                              )}
                              {/* Status Badge */}
                              <span
                                className="px-2 py-0.5 rounded text-xs leading-4"
                                style={{
                                  backgroundColor: badgeStyle.bg,
                                  color: badgeStyle.text,
                                  border: `1px solid ${badgeStyle.border}`,
                                }}
                              >
                                {item.statusLabel || '未着手'}
                              </span>
                            </div>
                            {item.deadline && (
                              <span
                                className="text-xs leading-4 lg:leading-5 tracking-[-0.150391px] flex-shrink-0"
                                style={{ color: item.deadlineColor || '#4A5565' }}
                              >
                                {item.deadline}
                              </span>
                            )}
                          </div>

                          <p className="text-xs lg:text-sm text-[#6A7282] leading-4 lg:leading-5 tracking-[-0.150391px]">
                            {item.description}
                          </p>

                          {/* Rejection Reason */}
                          {isRejected && item.rejectionReason && (
                            <div className="flex flex-col items-start p-3 gap-1 w-full bg-[#FEF2F2] border border-[#FFC9C9] rounded-[10px]">
                              <div className="flex flex-row items-center gap-1">
                                <Image
                                  src="/icons/exclamation.svg"
                                  alt="warning"
                                  width={14}
                                  height={14}
                                />
                                <span className="text-xs font-semibold text-[#82181A]">差戻し理由</span>
                              </div>
                              <p className="text-xs text-[#9F0712]">{item.rejectionReason}</p>
                            </div>
                          )}

                          <div className="flex flex-row items-center gap-3 flex-wrap">
                            {item.linkUrl ? (
                              <a
                                href={item.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-row items-center gap-1 text-xs lg:text-sm text-[#155DFC] leading-4 lg:leading-5 tracking-[-0.150391px] hover:underline"
                              >
                                <DocumentIcon size={16} color="#155DFC" />
                                <span>{item.linkText}</span>
                              </a>
                            ) : item.type === 'file_upload' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  fetchTaskAttachments(item.id);
                                  setConfirmDocsTaskId(item.id);
                                  setConfirmDocsMode('expert');
                                }}
                                className="flex flex-row items-center gap-1 text-xs lg:text-sm text-[#155DFC] leading-4 lg:leading-5 tracking-[-0.150391px] hover:underline cursor-pointer"
                              >
                                <DocumentIcon size={16} color="#155DFC" />
                                <span>{item.linkText}</span>
                              </button>
                            ) : (item.assignee_role === 'customer' || item.assignee_role == null) && (taskAttachments[item.id]?.length ?? 0) > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  fetchTaskAttachments(item.id);
                                  setConfirmDocsTaskId(item.id);
                                  setConfirmDocsMode('expert');
                                }}
                                className="flex flex-row items-center gap-1 text-xs lg:text-sm text-[#155DFC] leading-4 lg:leading-5 tracking-[-0.150391px] hover:underline cursor-pointer"
                              >
                                <DocumentIcon size={16} color="#155DFC" />
                                <span>{item.linkText}</span>
                              </button>
                            ) : null}

                            {/* Form input task: open form modal */}
                            {item.type === 'form_input' && canSubmit && !item.completed && (
                              <button
                                onClick={() => setFormModalTaskId(item.id)}
                                className="flex flex-row items-center gap-1 px-3 py-1.5 bg-[#155DFC] text-white text-xs lg:text-sm rounded-lg hover:bg-[#1447E6] transition-colors"
                              >
                                フォームを入力
                              </button>
                            )}
                            {/* 提出する possible + 顧客担当: upload + submit（file_upload は1件以上で提出、それ以外は0件でも提出可） */}
                            {canSubmit && !item.completed && (item.assignee_role === 'customer' || item.assignee_role == null) && item.type !== 'form_input' && (
                              <>
                                <label className="flex flex-row items-center gap-1 px-3 py-1.5 bg-[#155DFC] text-white text-xs lg:text-sm rounded-lg hover:bg-[#1447E6] transition-colors cursor-pointer">
                                  <UploadIcon size={14} color="#FFFFFF" />
                                  {uploadLoading === item.id ? 'アップロード中...' : '見本ファイルをアップロード'}
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept={getAcceptAttribute()}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleTaskFileUpload(item.id, f);
                                      e.target.value = '';
                                    }}
                                    disabled={uploadLoading === item.id}
                                  />
                                </label>
                                {(() => {
                                  const myCount = (taskAttachments[item.id] ?? []).filter((a) => a.uploaded_by_me).length;
                                  return myCount > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        fetchTaskAttachments(item.id);
                                        setConfirmDocsTaskId(item.id);
                                        setConfirmDocsMode('mine'); // (N件)は自分のアップロード数を表示するので、自分の書類を見せる
                                      }}
                                      className="text-[#008236] font-medium text-xs lg:text-sm hover:underline cursor-pointer"
                                    >
                                      （{myCount}件）
                                    </button>
                                  ) : null;
                                })()}
                                {/* file_upload: 提出するは1件以上で表示 / それ以外: 常に表示 */}
                                {(item.type === 'file_upload' ? (taskAttachments[item.id]?.length ?? 0) > 0 : true) && (
                                  <button
                                    onClick={() => handleTaskSubmit(item.id)}
                                    disabled={isLoading}
                                    className="flex flex-row items-center gap-1 px-3 py-1.5 bg-[#00C950] text-white text-xs lg:text-sm rounded-lg hover:bg-[#00A63E] transition-colors disabled:opacity-50 mt-2"
                                  >
                                    {isLoading ? '処理中...' : isRejected ? '再提出する' : '提出する'}
                                  </button>
                                )}
                              </>
                            )}
                            {/* 専門家担当タスクで提出のみ（アップロードUIなし） */}
                            {canSubmit && !item.completed && item.assignee_role !== 'customer' && item.assignee_role != null && item.type !== 'file_upload' && item.type !== 'form_input' && (
                              <button
                                onClick={() => handleTaskSubmit(item.id)}
                                disabled={isLoading}
                                className="flex flex-row items-center gap-1 px-3 py-1.5 bg-[#155DFC] text-white text-xs lg:text-sm rounded-lg hover:bg-[#1447E6] transition-colors disabled:opacity-50"
                              >
                                {isLoading ? '処理中...' : isRejected ? '再提出する' : '提出する'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  </>
                )}
              </div>
            </>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="flex flex-col items-start w-full flex-grow min-h-0 bg-white">
              <div className="flex flex-col items-start px-4 lg:px-4 py-4 lg:py-4 gap-2 lg:gap-2 w-full bg-white border-b border-[#E5E7EB] flex-shrink-0">
                <h2 className="text-lg lg:text-base font-medium lg:font-normal leading-7 lg:leading-6 tracking-[-0.439453px] lg:tracking-[-0.3125px] text-[#101828]">
                  メッセージ
                </h2>
                <p className="text-sm lg:text-sm text-[#6A7282] leading-5 lg:leading-5 tracking-[-0.150391px]">
                  担当者との会話
                </p>
              </div>

              <div className="flex flex-col items-start px-4 lg:px-4 py-6 lg:py-4 gap-6 lg:gap-6 w-full flex-grow overflow-y-auto bg-white min-h-0">
                {caseMessagesLoading ? (
                  <p className="text-sm text-[#6A7282]">読み込み中...</p>
                ) : caseMessages.length === 0 ? (
                  <p className="text-sm text-[#6A7282]">メッセージはまだありません。</p>
                ) : (
                  caseMessages.map((message) => {
                    const d = new Date(message.created_at);
                    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const isMine = message.is_mine ?? false;
                    const avatarBg = message.is_expert ? '#F3E8FF' : '#DBEAFE';
                    const avatarColor = message.is_expert ? '#8200DB' : '#1447E6';
                    const msgAttachments = (message as CaseMessage).attachments ?? [];
                    const isImageAttachment = (fileName: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                    const Avatar = () => (
                      <div
                        className="flex justify-center items-center w-12 h-12 lg:w-12 lg:h-12 rounded-full flex-shrink-0"
                        style={{ background: isMine ? '#E5E7EB' : avatarBg }}
                      >
                        <span
                          className="text-lg lg:text-lg font-normal leading-7 lg:leading-7 tracking-[-0.439453px]"
                          style={{ color: isMine ? '#4A5565' : avatarColor }}
                        >
                          {message.sender_initial}
                        </span>
                      </div>
                    );
                    // グリッド: [左アバター] [黒エリア1fr] [白エリア1fr] [右アバター] → 黒の右端と白の左端が中央で揃う
                    return (
                      <div
                        key={message.id}
                        className="grid grid-cols-[auto_1fr_1fr_auto] items-start gap-x-3 w-full"
                      >
                        {isMine ? (
                          <>
                            <div className="col-span-2" />
                            <div className="flex flex-col gap-1 items-end min-w-0 max-w-[85%]">
                              <div className="flex flex-row items-center gap-2 flex-wrap justify-end">
                                <span className="text-xs text-[#6A7282]">{dateStr}</span>
                                <h4 className="text-sm font-medium text-[#101828]">{message.sender_name}</h4>
                              </div>
                              <div className="flex flex-col items-end p-3 lg:p-4 gap-3 w-fit max-w-full rounded-[12px] bg-white border border-[#E5E7EB] shadow-sm">
                                {message.content ? (
                                  <p className="text-sm font-normal leading-[23px] tracking-[-0.150391px] text-[#101828] whitespace-pre-line text-right break-words">
                                    {message.content}
                                  </p>
                                ) : null}
                                {msgAttachments.length > 0 ? (
                                  <div className="flex flex-col gap-2 items-end">
                                    {msgAttachments.map((a) =>
                                      isImageAttachment(a.file_name) ? (
                                        <a
                                          key={a.id}
                                          href={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block max-w-[200px] lg:max-w-[280px] rounded-lg overflow-hidden border border-[#E5E7EB]"
                                        >
                                          <img
                                            src={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                            alt={a.file_name}
                                            className="w-full h-auto max-h-48 object-cover"
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          key={a.id}
                                          href={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-row items-center gap-1 text-xs text-[#155DFC] hover:underline"
                                        >
                                          <DocumentIcon size={14} color="#155DFC" />
                                          {a.file_name}
                                        </a>
                                      )
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <Avatar />
                          </>
                        ) : (
                          <>
                            <Avatar />
                            <div className="flex flex-col gap-1 min-w-0 max-w-[85%]">
                              <div className="flex flex-row items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-medium text-[#101828]">{message.sender_name}</h4>
                                <span className="text-xs text-[#6A7282]">{dateStr}</span>
                              </div>
                              <div className="flex flex-col items-start p-3 lg:p-4 gap-3 w-fit max-w-full rounded-[12px] bg-[#4A5565] shadow-sm">
                                {message.content ? (
                                  <p className="text-sm font-normal leading-[23px] tracking-[-0.150391px] text-white whitespace-pre-line break-words">
                                    {message.content}
                                  </p>
                                ) : null}
                                {msgAttachments.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    {msgAttachments.map((a) =>
                                      isImageAttachment(a.file_name) ? (
                                        <a
                                          key={a.id}
                                          href={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block max-w-[200px] lg:max-w-[280px] rounded-lg overflow-hidden border border-white/20"
                                        >
                                          <img
                                            src={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                            alt={a.file_name}
                                            className="w-full h-auto max-h-48 object-cover"
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          key={a.id}
                                          href={`/api/cases/${id}/messages/attachments/${a.id}/download`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-row items-center gap-1 text-xs text-[#93C5FD] hover:underline"
                                        >
                                          <DocumentIcon size={14} color="#93C5FD" />
                                          {a.file_name}
                                        </a>
                                      )
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="col-span-2" />
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col items-start px-4 lg:px-4 py-4 lg:py-[17px] gap-3 lg:gap-3 w-full bg-[#F9FAFB] border-t border-[#E5E7EB] flex-shrink-0">
                {/* 添付ファイルプレビュー（画像はサムネイル、それ以外はファイル名） */}
                {messageAttachment && (
                  <div className="flex flex-row items-start gap-2 w-full p-2 bg-white border border-[#E5E7EB] rounded-[10px]">
                    {messageAttachment.type.startsWith('image/') && messagePreviewUrl ? (
                      <div className="relative flex-shrink-0">
                        <img
                          src={messagePreviewUrl}
                          alt={messageAttachment.name}
                          className="w-16 h-16 lg:w-20 lg:h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMessageAttachment(null);
                            if (messageFileInputRef.current) messageFileInputRef.current.value = '';
                          }}
                          className="absolute -top-1 -right-1 flex justify-center items-center w-5 h-5 rounded-full bg-[#4A5565] text-white hover:bg-[#364153]"
                          aria-label="添付を解除"
                        >
                          <XIcon size={12} color="#FFFFFF" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center gap-2 flex-grow min-w-0">
                        <DocumentIcon size={20} color="#4A5565" className="flex-shrink-0" />
                        <span className="text-sm text-[#4A5565] truncate flex-grow" title={messageAttachment.name}>
                          {messageAttachment.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageAttachment(null);
                            if (messageFileInputRef.current) messageFileInputRef.current.value = '';
                          }}
                          className="flex-shrink-0 p-1 rounded hover:bg-gray-100"
                          aria-label="添付を解除"
                        >
                          <XIcon size={14} color="#4A5565" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col items-start w-full">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="メッセージを入力"
                    className="w-full px-3 lg:px-4 py-3 lg:py-3 text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[#0A0A0A]/50 bg-white border border-[#E5E7EB] lg:border-[#D1D5DC] rounded-[10px] resize-none focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex flex-row justify-between items-center w-full gap-3 lg:gap-0 flex-wrap">
                  <div className="flex flex-row items-center gap-2 flex-wrap">
                    <input
                      id="message-file-attach"
                      ref={messageFileInputRef}
                      type="file"
                      className="hidden"
                      accept={getAcceptAttribute()}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setMessageAttachment(f ?? null);
                      }}
                    />
                    <label
                      htmlFor="message-file-attach"
                      className="flex flex-row items-center gap-2 lg:gap-2 px-3 lg:px-3 py-2 lg:py-2 hover:bg-gray-100 rounded-[10px] transition-colors cursor-pointer"
                    >
                      <PaperclipIcon size={16} color="#4A5565" className="lg:w-5 lg:h-5" />
                      <span className="text-sm lg:text-sm font-medium lg:font-normal leading-5 lg:leading-5 tracking-[-0.150391px] text-[#4A5565]">
                        ファイルを添付する
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !messageAttachment) || caseMessagesSending}
                    className={`flex flex-row items-center gap-2 lg:gap-2 px-4 lg:px-4 py-2 lg:py-2 rounded-[10px] transition-colors ${
                      messageText.trim() || messageAttachment
                        ? 'bg-[#155DFC] hover:bg-[#1447E6]'
                        : 'bg-[#155DFC] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <SendIcon size={16} color="#FFFFFF" className="lg:w-5 lg:h-5" />
                    <span className="text-sm lg:text-base font-medium lg:font-normal leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-white">
                      {caseMessagesSending ? '送信中...' : '送信'}
                    </span>
                  </button>
                </div>

                <p className="hidden lg:block text-xs text-[#6A7282] leading-4">
                  Ctrl/Cmd + Enterで送信できます
                </p>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <>
              <div className="flex flex-col items-start px-4 lg:px-4 py-4 lg:py-4 gap-3 lg:gap-3 w-full bg-white border-b border-[#E5E7EB]">
                <div className="flex flex-row justify-between items-center w-full gap-3 lg:gap-0">
                  <h2 className="text-lg lg:text-base font-medium lg:font-normal leading-7 lg:leading-6 tracking-[-0.439453px] lg:tracking-[-0.3125px] text-[#101828]">
                    メンバーリスト
                  </h2>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="flex flex-row items-center gap-2 lg:gap-2 px-4 lg:px-4 py-2 lg:py-2 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors flex-shrink-0"
                  >
                    <PlusIcon size={16} color="#FFFFFF" className="lg:w-4 lg:h-4" />
                    <span className="text-sm lg:text-base font-medium lg:font-normal leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-white">
                      メンバー追加
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-start px-4 lg:px-6 py-6 lg:py-6 gap-3 lg:gap-3 w-full bg-white">
                {caseMembersLoading ? (
                  <div className="w-full py-8 text-center text-[#6A7282]">読み込み中...</div>
                ) : caseMembers.length === 0 ? (
                  <div className="w-full py-8 text-center text-[#6A7282]">メンバーがいません。追加ボタンから招待してください。</div>
                ) : (
                  caseMembers.map((member) => (
                    <div
                      key={member.type === 'invite' ? member.id : member.id}
                      className="flex flex-row justify-between items-center px-4 lg:px-6 py-3 lg:py-3 gap-3 lg:gap-4 w-full bg-white border-[0.57px] lg:border-2 border-[#E5E7EB] rounded-[14px]"
                    >
                      <div className="flex flex-row items-center gap-2 lg:gap-4 flex-grow min-w-0">
                        <span
                          className="px-3 lg:px-3 py-1.5 lg:py-1.5 rounded-full text-xs lg:text-sm leading-4 lg:leading-5 tracking-[-0.150391px] border flex-shrink-0"
                          style={{
                            background: member.roleBgColor,
                            color: member.roleTextColor,
                            borderColor: member.roleBorderColor,
                          }}
                        >
                          {member.roleText}
                        </span>
                        <span className="text-base lg:text-lg font-normal leading-6 lg:leading-7 tracking-[-0.3125px] lg:tracking-[-0.439453px] text-[#101828] truncate">
                          {member.name}
                        </span>
                      </div>

                      {member.canDelete && caseMembersIsApplicant && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('このメンバーを削除しますか？')) return;
                            const body = member.type === 'invite'
                              ? { type: 'invite', inviteId: Number(String(member.id).replace(/^invite-/, '')) }
                              : { type: 'member', userId: member.id };
                            const res = await fetch(`/api/cases/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                            if (res.ok) await fetchCaseMembers();
                            else {
                              const data = await res.json().catch(() => ({}));
                              alert(data.error || '削除に失敗しました');
                            }
                          }}
                          className="flex flex-row items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2 bg-[#F3F4F6] rounded-[10px] hover:bg-[#E5E7EB] transition-colors flex-shrink-0"
                        >
                          <XIcon size={16} color="#364153" className="lg:w-4 lg:h-4" />
                          <span className="text-sm lg:text-base font-medium lg:font-normal leading-5 lg:leading-6 tracking-[-0.150391px] lg:tracking-[-0.3125px] text-[#364153]">
                            削除
                          </span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </> 
          )}
        </div>
        </>)}
      </main>

      {/* Add Member Modal（状態は AddMemberModalContent 内に閉じ込め、入力時に役割がリセットされないようにする） */}
      {isAddMemberModalOpen && (
        <AddMemberModalContent
          caseId={id}
          onClose={() => setIsAddMemberModalOpen(false)}
          onKeyDown={handleModalKeyDown}
          onSuccess={fetchCaseMembers}
        />
      )}

      {/* Task Form Modal (form_input type) */}
      {formModalTaskId != null && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={() => setFormModalTaskId(null)}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex flex-col bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <h2 className="text-lg font-semibold text-[#111827]">{formTaskTitle || 'フォーム入力'}</h2>
              <button
                onClick={() => setFormModalTaskId(null)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="閉じる"
              >
                <XIcon size={20} color="#4A5565" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-4 overflow-y-auto">
              {formLoading ? (
                <p className="text-sm text-[#4B5563]">読み込み中...</p>
              ) : formQuestions.length === 0 ? (
                <p className="text-sm text-[#4B5563]">質問がありません。</p>
              ) : (
                formQuestions.map((q) => (
                  <div key={q.id} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#111827]">
                      {q.question_text}
                      {q.is_required && <span className="text-[#C10007] ml-0.5">*</span>}
                    </label>
                    {q.input_type === 'text' && (
                      <input
                        type="text"
                        value={formAnswers[String(q.id)] ?? ''}
                        onChange={(e) => setFormAnswers(prev => ({ ...prev, [String(q.id)]: e.target.value }))}
                        placeholder="入力してください"
                        className="w-full px-3 py-2 border border-[#9CA3AF] rounded-lg text-sm text-[#111827] placeholder:text-[#6B7280] bg-white focus:ring-2 focus:ring-[#155DFC] focus:border-[#155DFC] focus:outline-none"
                      />
                    )}
                    {q.input_type === 'number' && (
                      <input
                        type="number"
                        value={formAnswers[String(q.id)] ?? ''}
                        onChange={(e) => setFormAnswers(prev => ({ ...prev, [String(q.id)]: e.target.value }))}
                        placeholder="入力してください"
                        className="w-full px-3 py-2 border border-[#9CA3AF] rounded-lg text-sm text-[#111827] placeholder:text-[#6B7280] bg-white focus:ring-2 focus:ring-[#155DFC] focus:border-[#155DFC] focus:outline-none"
                      />
                    )}
                    {q.input_type === 'radio' && Array.isArray(q.options) && (
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={(formAnswers[String(q.id)] ?? '') === opt}
                              onChange={() => setFormAnswers(prev => ({ ...prev, [String(q.id)]: opt }))}
                              className="w-4 h-4 border-2 border-[#9CA3AF] rounded-full text-[#155DFC] focus:ring-2 focus:ring-[#155DFC]"
                            />
                            <span className="text-sm text-[#111827]">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.input_type === 'checkbox' && Array.isArray(q.options) && (
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt) => {
                          const current = formAnswers[String(q.id)] ?? '';
                          let arr: string[] = [];
                          if (current) {
                            try {
                              const parsed = JSON.parse(current);
                              arr = Array.isArray(parsed) ? parsed : [];
                            } catch {
                              arr = [];
                            }
                          }
                          const checked = arr.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked ? arr.filter(x => x !== opt) : [...arr, opt];
                                  setFormAnswers(prev => ({ ...prev, [String(q.id)]: JSON.stringify(next) }));
                                }}
                                className="w-4 h-4 border-2 border-[#9CA3AF] rounded text-[#155DFC] focus:ring-2 focus:ring-[#155DFC]"
                              />
                              <span className="text-sm text-[#111827]">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {!formLoading && formQuestions.length > 0 && (
              <div className="flex flex-row gap-3 px-4 py-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => handleFormSave(false)}
                  disabled={formSaving}
                  className="flex-1 px-4 py-2 border-2 border-[#9CA3AF] rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-100 disabled:opacity-50"
                >
                  {formSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => handleFormSave(true)}
                  disabled={formSaving}
                  className="flex-1 px-4 py-2 bg-[#155DFC] text-white rounded-lg text-sm font-medium hover:bg-[#1447E6] disabled:opacity-50"
                >
                  {formSaving ? '提出中...' : '提出する'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDocsTaskId != null && confirmDocsMode != null && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={() => { setConfirmDocsTaskId(null); setConfirmDocsMode(null); }}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex flex-col bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <h2 className="text-lg font-medium text-[#101828]">
                {confirmDocsMode === 'expert' ? '専門家からの書類' : 'アップロードした書類'}
              </h2>
              <button
                onClick={() => { setConfirmDocsTaskId(null); setConfirmDocsMode(null); }}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="閉じる"
              >
                <XIcon size={20} color="#4A5565" />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4 overflow-y-auto">
              {(() => {
                const list = (taskAttachments[confirmDocsTaskId] ?? []).filter((a) =>
                  confirmDocsMode === 'expert' ? !a.uploaded_by_me : !!a.uploaded_by_me
                );
                return list.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {list.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]"
                      >
                        <DocumentIcon size={20} color="#155DFC" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#101828] truncate block">{a.file_name}</span>
                          <span className="text-xs text-[#6A7282]">{Math.round(a.file_size / 1024)}KB</span>
                        </div>
                        {confirmDocsMode === 'expert' && typeof a.id === 'number' && (
                          <a
                            href={`/api/tasks/${confirmDocsTaskId}/attachments/${a.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-[#155DFC] hover:text-[#1447E6] hover:underline rounded-lg border border-[#155DFC] hover:bg-[#EFF6FF] transition-colors"
                          >
                            ダウンロード
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#6A7282] py-4">
                    {confirmDocsMode === 'expert' ? '専門家から送られた書類はまだありません。' : 'アップロードした書類はまだありません。'}
                  </p>
                );
              })()}
            </div>
            <div className="px-4 py-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => { setConfirmDocsTaskId(null); setConfirmDocsMode(null); }}
                className="w-full px-4 py-2.5 bg-[#155DFC] text-white text-sm font-medium rounded-[10px] hover:bg-[#1447E6] transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <HomeIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ホーム</span>
        </Link>
        <Link href="/dashboard/cases" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <DocumentIcon size={20} color="#155DFC" />
          <span className="text-xs text-[#155DFC] leading-4">案件</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <UserIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">マイページ</span>
        </Link>
        <Link href="/logout" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <LogOutIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ログアウト</span>
        </Link>
      </nav>
    </div>
  );
}
