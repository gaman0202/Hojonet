'use client';

import { useState, useEffect } from 'react';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import { SearchIcon, PlusIcon, DocumentIcon, ChatBubbleIcon, CheckboxIcon } from '@/components/icons';
import TemplateCard from './components/TemplateCard';
import DocumentTemplateCard from './components/DocumentTemplateCard';
import TaskTemplateCard from './components/TaskTemplateCard';
import HearingTemplateCard from './components/HearingTemplateCard';
import TemplateModal from './components/TemplateModal';
import DocumentTemplateModal from './components/DocumentTemplateModal';
import TaskTemplateModal from './components/TaskTemplateModal';
import HearingTemplateModal from './components/HearingTemplateModal';
import {
  filterCategories,
  documentFilterCategories,
  taskFilterCategories,
} from './data';
import { Template, DocumentTemplate, TaskTemplate, HearingTemplate, HearingQuestion, TemplateType, TaskCategory, Priority, Role } from './types';

export default function TemplatesPage() {
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType>('message');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<Template[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [hearingTemplates, setHearingTemplates] = useState<HearingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Template | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentTemplate | null>(null);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [editingHearing, setEditingHearing] = useState<HearingTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/expert/templates');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setMessageTemplates(data.messageTemplates ?? []);
        setDocumentTemplates(data.documentTemplates ?? []);
        setTaskTemplates(data.taskTemplates ?? []);
        setHearingTemplates(data.hearingTemplates ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Get current filter categories based on template type
  const currentFilterCategories =
    activeTemplateType === 'task'
      ? taskFilterCategories
      : activeTemplateType === 'hearing'
        ? [] // No filters for hearing templates
        : filterCategories;

  // Filter templates based on active category and search query
  const filteredMessageTemplates = messageTemplates.filter((template) => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredTaskTemplates = taskTemplates.filter((template) => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter hearing templates
  const filteredHearingTemplates = hearingTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredTemplates =
    activeTemplateType === 'task'
      ? filteredTaskTemplates
      : activeTemplateType === 'hearing'
        ? filteredHearingTemplates
        : filteredMessageTemplates;

  const handleCopy = (template: Template) => {
    navigator.clipboard.writeText(template.content);
    // You can add a toast notification here
  };

  const handleDownload = (template: DocumentTemplate) => {
    console.log('Download:', template.title);
    // You can add download logic here
  };

  const handleOpenLink = (template: DocumentTemplate) => {
    if (template.actionUrl) {
      window.open(template.actionUrl, '_blank');
    }
  };

  const handleNewTemplate = () => {
    setEditingMessage(null);
    setEditingDocument(null);
    setEditingTask(null);
    setEditingHearing(null);
    setIsModalOpen(true);
  };

  const handleTemplateTypeChange = (type: TemplateType) => {
    setActiveTemplateType(type);
    setActiveCategory('all'); // Reset filter when changing template type
  };

  const handleSubmitTemplate = async (data: { name: string; category: string; content: string }, templateId?: string) => {
    const body = { type: 'message', category: data.category, title: data.name, content: data.content };
    if (templateId && editingMessage) {
      const res = await fetch('/api/expert/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: templateId, ...body }) });
      if (res.ok) {
        setMessageTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, title: data.name, category: data.category as Template['category'], content: data.content } : t)));
      }
    } else {
      const res = await fetch('/api/expert/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const { id } = await res.json();
        setMessageTemplates((prev) => [{ id, title: data.name, category: data.category as Template['category'], content: data.content, type: 'message' }, ...prev]);
      }
    }
    setEditingMessage(null);
    setIsModalOpen(false);
  };

  const handleSubmitDocumentTemplate = async (data: {
    name: string;
    category: string;
    type: 'file' | 'link';
    description: string;
    file?: File;
    linkUrl?: string;
  }, templateId?: string) => {
    const doc: DocumentTemplate = {
      id: templateId ?? `new-${Date.now()}`,
      category: data.category as DocumentTemplate['category'],
      title: data.name,
      description: data.description,
      updatedDate: new Date().toISOString().slice(0, 10),
      usageCount: editingDocument?.usageCount ?? 0,
      iconType: data.type === 'link' ? 'link' : 'document',
      actionType: data.type === 'link' ? 'link' : 'download',
      actionUrl: data.linkUrl,
      type: 'document',
    };

    const buildRequest = (): RequestInit => {
      if (data.file) {
        const fd = new FormData();
        if (templateId) fd.append('id', templateId);
        fd.append('type', 'document');
        fd.append('category', data.category);
        fd.append('title', data.name);
        fd.append('description', data.description);
        fd.append('action_type', 'download');
        fd.append('file', data.file, data.file.name);
        // Content-Type は設定しない → ブラウザが boundary 付きで自動設定
        return { body: fd };
      }
      return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, type: 'document', category: data.category, title: data.name, description: data.description, action_type: data.type === 'link' ? 'link' : 'download', action_url: data.linkUrl ?? null }),
      };
    };

    if (templateId && editingDocument) {
      const res = await fetch('/api/expert/templates', { method: 'PUT', ...buildRequest() });
      if (res.ok) setDocumentTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...doc, fileName: data.file?.name ?? editingDocument.fileName } : t)));
      else console.error('PUT failed', await res.text());
    } else {
      const res = await fetch('/api/expert/templates', { method: 'POST', ...buildRequest() });
      if (res.ok) {
        const { id } = await res.json();
        setDocumentTemplates((prev) => [{ ...doc, id, fileName: data.file?.name }, ...prev]);
      } else {
        console.error('POST failed', await res.text());
      }
    }
    setEditingDocument(null);
    setIsModalOpen(false);
  };

  const handleSubmitTaskTemplate = async (data: {
    name: string;
    category: TaskCategory;
    type: 'file' | 'form';
    content: string;
    file?: File;
    questions?: Array<{ id: string; content: string }>;
    deadline: string;
    priority: Priority;
    assignee: Role;
    item: string;
    reminder: boolean;
  }, templateId?: string) => {
    const task: TaskTemplate = {
      id: templateId ?? `new-${Date.now()}`,
      category: data.category,
      title: data.name,
      description: data.content,
      priority: data.priority,
      role: data.assignee,
      fileName: data.file?.name ?? editingTask?.fileName,
      type: 'task',
    };

    const buildRequest = (): RequestInit => {
      if (data.file) {
        const fd = new FormData();
        if (templateId) fd.append('id', templateId);
        fd.append('type', 'task');
        fd.append('category', data.category);
        fd.append('title', data.name);
        fd.append('description', data.content);
        fd.append('priority', data.priority);
        fd.append('assignee_role', data.assignee);
        fd.append('file', data.file, data.file.name);
        return { body: fd };
      }
      return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, type: 'task', category: data.category, title: data.name, description: data.content, priority: data.priority, assignee_role: data.assignee }),
      };
    };

    if (templateId && editingTask) {
      const res = await fetch('/api/expert/templates', { method: 'PUT', ...buildRequest() });
      if (res.ok) setTaskTemplates((prev) => prev.map((t) => (t.id === templateId ? task : t)));
      else console.error('PUT task failed', await res.text());
    } else {
      const res = await fetch('/api/expert/templates', { method: 'POST', ...buildRequest() });
      if (res.ok) {
        const { id } = await res.json();
        setTaskTemplates((prev) => [{ ...task, id }, ...prev]);
      } else {
        console.error('POST task failed', await res.text());
      }
    }
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleSubmitHearingTemplate = async (data: {
    title: string;
    description: string;
    subsidyType: string;
    questions: HearingQuestion[];
  }, templateId?: string) => {
    const isEdit = Boolean(templateId && editingHearing);
    try {
      if (isEdit && templateId) {
        const res = await fetch('/api/expert/hearing-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: templateId,
            title: data.title,
            description: data.description,
            subsidyType: data.subsidyType,
            questions: data.questions,
          }),
        });
        if (!res.ok) {
          console.error('PUT hearing-template failed', await res.text());
          return;
        }
        const updated: HearingTemplate = {
          id: templateId,
          title: data.title,
          description: data.description,
          subsidyType: data.subsidyType,
          questions: data.questions,
          isActive: true,
        };
        setHearingTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
      } else {
        const res = await fetch('/api/expert/hearing-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            subsidyType: data.subsidyType,
            questions: data.questions,
          }),
        });
        if (!res.ok) {
          console.error('POST hearing-template failed', await res.text());
          return;
        }
        const json = await res.json().catch(() => ({}));
        const newId = String(json.id ?? `h${Date.now()}`);
        const newTemplate: HearingTemplate = {
          id: newId,
          title: data.title,
          description: data.description,
          subsidyType: data.subsidyType,
          questions: data.questions,
          isActive: true,
        };
        setHearingTemplates((prev) => [newTemplate, ...prev]);
      }
    } finally {
      setEditingHearing(null);
      setIsModalOpen(false);
    }
  };

  const handleEditMessageTemplate = (template: Template) => {
    setEditingMessage(template);
    setIsModalOpen(true);
  };

  const handleEditDocumentTemplate = (template: DocumentTemplate) => {
    setEditingDocument(template);
    setIsModalOpen(true);
  };

  const handleEditTaskTemplate = (template: TaskTemplate) => {
    setEditingTask(template);
    setIsModalOpen(true);
  };

  const handleEditHearingTemplate = (template: HearingTemplate) => {
    setEditingHearing(template);
    setIsModalOpen(true);
  };

  const handleDeleteMessageTemplate = async (template: Template) => {
    await fetch(`/api/expert/templates?id=${template.id}`, { method: 'DELETE' });
    setMessageTemplates((prev) => prev.filter((t) => t.id !== template.id));
    if (editingMessage?.id === template.id) setEditingMessage(null);
  };

  const handleDeleteDocumentTemplate = async (template: DocumentTemplate) => {
    await fetch(`/api/expert/templates?id=${template.id}`, { method: 'DELETE' });
    setDocumentTemplates((prev) => prev.filter((t) => t.id !== template.id));
    if (editingDocument?.id === template.id) setEditingDocument(null);
  };

  const handleDeleteTaskTemplate = async (template: TaskTemplate) => {
    await fetch(`/api/expert/templates?id=${template.id}`, { method: 'DELETE' });
    setTaskTemplates((prev) => prev.filter((t) => t.id !== template.id));
    if (editingTask?.id === template.id) setEditingTask(null);
  };

  const handleDeleteHearingTemplate = async (template: HearingTemplate) => {
    await fetch(`/api/expert/hearing-templates?id=${template.id}`, { method: 'DELETE' });
    setHearingTemplates((prev) => prev.filter((t) => t.id !== template.id));
    if (editingHearing?.id === template.id) setEditingHearing(null);
  };

  const handleDuplicateHearingTemplate = (template: HearingTemplate) => {
    const newTemplate: HearingTemplate = {
      ...template,
      id: `h${Date.now()}`,
      title: `${template.title} (コピー)`,
    };
    setHearingTemplates([newTemplate, ...hearingTemplates]);
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <ExpertSidebar activeItem="templates" />

      {/* Main Content - overflow-x-hidden으로 전체 화면 가로 스크롤 방지 */}
      <main className="flex flex-col items-start flex-grow min-w-0 lg:ml-[255px] overflow-x-hidden w-full">
        {/* Header Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 lg:pb-[1px] gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1 pb-0 lg:pb-4">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                テンプレート管理
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                {activeTemplateType === 'message'
                  ? 'よく使用するメッセージを登録・管理'
                  : activeTemplateType === 'document'
                    ? '補助金申請に必要な書類テンプレートと外部リンクを管理'
                    : '補助金申請に必要な書類テンプレートと外部リンクを管理'}
              </p>
            </div>
          </div>
        </div>

        {/* Template Type Buttons and Search Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 pb-4 lg:py-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          {/* Template Type Buttons */}
          <div className="flex flex-row items-start gap-2 sm:gap-3 w-full flex-wrap">
            <button
              onClick={() => handleTemplateTypeChange('message')}
              className={`flex flex-row items-center px-3 sm:px-4 gap-2 h-10 rounded-[10px] transition-colors flex-shrink-0 ${
                activeTemplateType === 'message'
                  ? 'bg-[#9810FA] text-white'
                  : 'bg-[#F3F4F6] text-[#364153] hover:bg-gray-200'
              }`}
            >
              <ChatBubbleIcon size={20} color={activeTemplateType === 'message' ? '#FFFFFF' : '#364153'} />
              <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] whitespace-nowrap">
                メッセージ
              </span>
            </button>
            <button
              onClick={() => handleTemplateTypeChange('task')}
              className={`flex flex-row items-center px-3 sm:px-4 gap-2 h-10 rounded-[10px] transition-colors flex-shrink-0 ${
                activeTemplateType === 'task'
                  ? 'bg-[#9810FA] text-white'
                  : 'bg-[#F3F4F6] text-[#364153] hover:bg-gray-200'
              }`}
            >
              <CheckboxIcon size={20} color={activeTemplateType === 'task' ? '#FFFFFF' : '#364153'} />
              <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] whitespace-nowrap">
                タスク
              </span>
            </button>
            <button
              onClick={() => handleTemplateTypeChange('hearing')}
              className={`flex flex-row items-center px-3 sm:px-4 gap-2 h-10 rounded-[10px] transition-colors flex-shrink-0 ${
                activeTemplateType === 'hearing'
                  ? 'bg-[#9810FA] text-white'
                  : 'bg-[#F3F4F6] text-[#364153] hover:bg-gray-200'
              }`}
            >
              <DocumentIcon size={20} color={activeTemplateType === 'hearing' ? '#FFFFFF' : '#364153'} />
              <span className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] whitespace-nowrap">
                ヒアリングフォーム
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <SearchIcon size={20} color="#99A1AF" />
            </div>
            <input
              type="text"
              placeholder={
                activeTemplateType === 'message'
                  ? 'テンプレート名や内容で検索...'
                  : 'テンプレート名や説明で検索...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[42px] pl-10 pr-4 text-sm sm:text-base font-normal leading-5 tracking-[-0.3125px] text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-start px-4 sm:px-6 py-4 sm:py-6 gap-4 sm:gap-6 w-full">
          {/* Filter Tabs and New Registration Button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-3 sm:gap-2">
            {/* Filter Tabs - 모바일: 가로 스크롤 1줄, sm 이상: 기존 wrap */}
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0 overflow-x-auto flex-nowrap sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
              {currentFilterCategories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className={`flex-shrink-0 px-4 py-2 h-[38px] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] transition-colors whitespace-nowrap ${
                    activeCategory === category.value
                      ? 'bg-[#364153] text-white'
                      : 'bg-white border border-[#D1D5DC] text-[#364153] hover:bg-gray-50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* New Registration Button */}
            <button
              onClick={handleNewTemplate}
              className="flex flex-row items-center justify-center px-4 gap-2 h-10 bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors flex-shrink-0 w-full sm:w-auto"
            >
              <PlusIcon size={20} color="#FFFFFF" />
              <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white whitespace-nowrap">
                新規登録
              </span>
            </button>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div className="w-full py-12 text-center text-[#4A5565]">読み込み中...</div>
          )}
          {error && (
            <div className="w-full py-12 text-center text-red-600">{error}</div>
          )}

          {/* Template Cards Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full auto-rows-fr">
              {activeTemplateType === 'task'
                ? filteredTaskTemplates.map((template) => (
                    <TaskTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTaskTemplate}
                      onDelete={handleDeleteTaskTemplate}
                    />
                  ))
                : activeTemplateType === 'hearing'
                  ? filteredHearingTemplates.map((template) => (
                      <HearingTemplateCard
                        key={template.id}
                        template={template}
                        onEdit={handleEditHearingTemplate}
                        onDelete={handleDeleteHearingTemplate}
                        onDuplicate={handleDuplicateHearingTemplate}
                      />
                    ))
                  : filteredMessageTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onCopy={handleCopy}
                        onEdit={handleEditMessageTemplate}
                        onDelete={handleDeleteMessageTemplate}
                      />
                    ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-12">
              <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
                該当するテンプレートが見つかりませんでした
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Template Modal */}
      {activeTemplateType === 'task' ? (
        <TaskTemplateModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSubmit={handleSubmitTaskTemplate}
          initialTemplate={editingTask}
        />
      ) : activeTemplateType === 'hearing' ? (
        <HearingTemplateModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingHearing(null); }}
          onSubmit={handleSubmitHearingTemplate}
          initialTemplate={editingHearing}
        />
      ) : (
        <TemplateModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingMessage(null); }}
          templateType={activeTemplateType}
          onSubmit={handleSubmitTemplate}
          initialTemplate={editingMessage}
        />
      )}
    </div>
  );
}
