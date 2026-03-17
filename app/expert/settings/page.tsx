'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ExpertSidebar, { MobileMenuButton } from '@/components/layout/ExpertSidebar';
import { useProfileStore } from '@/store/useProfileStore';
import { PlusIcon, TrashIcon, MailIcon, LinkIcon, CopyIcon, XIcon, LockIcon, EyeIcon, UserIcon, UsersIcon, BellIconAlt, LockIconAlt } from '@/components/icons';
import AddMemberModal from './components/AddMemberModal';

type SettingsTab = 'profile' | 'notifications' | 'team' | 'security';

interface Expertise {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'administrative-scrivener' | 'assistant';
  avatarColor: string;
  avatarBgColor: string;
  roleColor: string;
  roleBgColor: string;
}

export default function ExpertSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [name, setName] = useState('');
  const [furigana, setFurigana] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [registrationYear, setRegistrationYear] = useState('');
  const [region, setRegion] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [expertiseList, setExpertiseList] = useState<Expertise[]>([]);
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Business hours state (월~일)
  const [businessHours, setBusinessHours] = useState<Record<string, { start: string; end: string; isClosed: boolean }>>({
    monday: { start: '09:00', end: '18:00', isClosed: false },
    tuesday: { start: '09:00', end: '18:00', isClosed: false },
    wednesday: { start: '09:00', end: '18:00', isClosed: false },
    thursday: { start: '09:00', end: '18:00', isClosed: false },
    friday: { start: '09:00', end: '18:00', isClosed: false },
    saturday: { start: '', end: '', isClosed: true },
    sunday: { start: '', end: '', isClosed: true },
  });
  const [newExpertise, setNewExpertise] = useState('');

  // Notification settings state
  const [deadlineReminder, setDeadlineReminder] = useState(true);
  const [newCaseNotification, setNewCaseNotification] = useState(true);
  const [documentUploadNotification, setDocumentUploadNotification] = useState(true);
  const [messageNotification, setMessageNotification] = useState(true);
  const [systemMaintenance, setSystemMaintenance] = useState(true);
  const [newFeatureRelease, setNewFeatureRelease] = useState(true);

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberTab, setAddMemberTab] = useState<'email' | 'link'>('email');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'administrative-scrivener' | 'assistant'>('assistant');
  const [memberMessage, setMemberMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('https://subsidy-platform.jp/invite/abc123xyz789');

  // Permissions state
  const [canCreateEditCases, setCanCreateEditCases] = useState(false);
  const [canViewCustomerInfo, setCanViewCustomerInfo] = useState(false);
  const [canApproveDocuments, setCanApproveDocuments] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  interface LoginHistory {
    id: string;
    date: string;
    time: string;
    location: string;
    device: string;
    isCurrentSession?: boolean;
  }

  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

  // Load profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expert/settings/profile');
      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        setName(p.name || '');
        setFurigana(p.furigana || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setMessage(p.message || '');
        setOfficeName(p.officeName || '');
        setOfficeLocation(p.officeLocation || '');
        setRegistrationNumber(p.registrationNumber || '');
        setAffiliation(p.affiliation || '');
        setRegistrationYear(p.registrationYear || '');
        setRegion(p.region || '');
        setIconUrl(p.iconUrl || '');
        setExpertiseList(p.expertise || []);
        if (p.businessHours) {
          setBusinessHours(p.businessHours);
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notification settings
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/expert/settings/notifications');
      if (res.ok) {
        const data = await res.json();
        const n = data.notifications;
        setDeadlineReminder(n.deadlineReminder ?? true);
        setNewCaseNotification(n.newCaseNotification ?? true);
        setDocumentUploadNotification(n.documentUploadNotification ?? true);
        setMessageNotification(n.messageNotification ?? true);
        setSystemMaintenance(n.systemMaintenance ?? true);
        setNewFeatureRelease(n.newFeatureRelease ?? true);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }, []);

  // Load team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const res = await fetch('/api/expert/settings/team');
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (e) {
      console.error('Error fetching team members:', e);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // Load login history
  const fetchLoginHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/expert/settings/login-history');
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data.history || []);
      }
    } catch (e) {
      console.error('Error fetching login history:', e);
    }
  }, []);

  // Load permissions
  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const res = await fetch('/api/expert/settings/permissions');
      if (res.ok) {
        const data = await res.json();
        setCanCreateEditCases(data.canCreateEditCases ?? false);
        setCanViewCustomerInfo(data.canViewCustomerInfo ?? false);
        setCanApproveDocuments(data.canApproveDocuments ?? false);
      }
    } catch (e) {
      console.error('Error fetching permissions:', e);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  // Save permissions
  const savePermissions = useCallback(async (permissions?: {
    canCreateEditCases?: boolean;
    canViewCustomerInfo?: boolean;
    canApproveDocuments?: boolean;
  }) => {
    try {
      const payload = permissions || {
        canCreateEditCases,
        canViewCustomerInfo,
        canApproveDocuments,
      };
      const res = await fetch('/api/expert/settings/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Silent save, no alert
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to save permissions:', err.error || res.statusText);
      }
    } catch (e) {
      console.error('Error saving permissions:', e);
    }
  }, [canCreateEditCases, canViewCustomerInfo, canApproveDocuments]);

  // Save notification settings
  const saveNotifications = useCallback(async () => {
    try {
      await fetch('/api/expert/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadlineReminder,
          newCaseNotification,
          documentUploadNotification,
          messageNotification,
          systemMaintenance,
          newFeatureRelease,
        }),
      });
    } catch (e) {
      console.error('Error saving notifications:', e);
    }
  }, [deadlineReminder, newCaseNotification, documentUploadNotification, messageNotification, systemMaintenance, newFeatureRelease]);

  // Delete team member
  const handleDeleteMember = useCallback(async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    try {
      const res = await fetch(`/api/expert/settings/team?id=${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('メンバーを削除しました');
        await fetchTeamMembers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`削除に失敗しました: ${err.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Delete member error:', e);
      alert('削除に失敗しました');
    }
  }, [fetchTeamMembers]);

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
    fetchTeamMembers();
    fetchLoginHistory();
    fetchPermissions();
  }, [fetchProfile, fetchNotifications, fetchTeamMembers, fetchLoginHistory, fetchPermissions]);

  const handleAddExpertise = useCallback(() => {
    if (newExpertise.trim()) {
      const maxId = expertiseList.length > 0 
        ? Math.max(...expertiseList.map(e => parseInt(e.id, 10) || 0))
        : 0;
      setExpertiseList([
        ...expertiseList,
        { id: String(maxId + 1), name: newExpertise.trim() },
      ]);
      setNewExpertise('');
    }
  }, [newExpertise, expertiseList]);

  const handleDeleteExpertise = (id: string) => {
    setExpertiseList(expertiseList.filter((item) => item.id !== id));
  };

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/expert/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          furigana,
          email,
          phone,
          message,
          officeName,
          officeLocation,
          registrationNumber,
          affiliation,
          registrationYear,
          businessHours,
          expertise: expertiseList,
        }),
      });
      if (res.ok) {
        await useProfileStore.getState().fetchProfile();
        alert('プロフィールを保存しました');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`保存に失敗しました: ${err.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Save error:', e);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [saving, name, furigana, email, phone, message, officeName, officeLocation, registrationNumber, affiliation, registrationYear, businessHours, expertiseList]);

  // プロフィール必須項目がすべて入力されているか（*付き項目）
  const isProfileRequiredFilled =
    name.trim() !== '' &&
    furigana.trim() !== '' &&
    email.trim() !== '' &&
    phone.trim() !== '' &&
    expertiseList.length > 0 &&
    officeName.trim() !== '' &&
    officeLocation.trim() !== '' &&
    registrationNumber.trim() !== '' &&
    affiliation.trim() !== '';

  const handleAddMember = useCallback(async () => {
    if (addMemberTab === 'email' && memberEmail.trim()) {
      const email = memberEmail.trim();
      if (!email) {
        alert('メールアドレスを入力してください');
        return;
      }
      try {
        const res = await fetch('/api/expert/settings/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            role: memberRole,
            message: memberMessage || null,
          }),
        });
        if (res.ok) {
          setMemberEmail('');
          setMemberMessage('');
          setIsAddMemberModalOpen(false);
          await fetchTeamMembers();
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = data.detail
            ? `${data.error}\n\n${data.detail}`
            : (data.error || '招待の登録に失敗しました');
          alert(msg);
        }
      } catch (e) {
        console.error('Add member error:', e);
        alert('招待の登録に失敗しました');
      }
    }
  }, [addMemberTab, memberEmail, memberRole, memberMessage, fetchTeamMembers]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    // You can add a toast notification here
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'チーム招待リンク',
        text: 'チームに参加してください',
        url: inviteLink,
      });
    } else {
      handleCopyLink();
    }
  };

  const handlePasswordChange = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('すべてのフィールドを入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('新しいパスワードが一致しません');
      return;
    }
    try {
      const res = await fetch('/api/expert/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      if (res.ok) {
        alert('パスワードを変更しました');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`パスワード変更に失敗しました: ${err.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Password change error:', e);
      alert('パスワード変更に失敗しました');
    }
  }, [currentPassword, newPassword, confirmPassword]);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <ExpertSidebar activeItem="settings" />

      {/* Main Content */}
      <main className="flex flex-col items-start flex-grow min-w-0 lg:ml-[255px] overflow-x-hidden w-full">
        {/* Header Section */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-6 lg:pb-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center gap-4 w-full">
            <MobileMenuButton />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                設定
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                システムとアカウントの設定を管理
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-row items-start px-4 lg:px-6 pt-6 pb-4 lg:py-6 gap-2 w-full bg-white border-b border-[#E5E7EB] overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-row items-center px-4 gap-2 h-9 rounded-[10px] transition-colors flex-shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#9810FA] text-white'
                : 'bg-transparent text-[#364153] hover:bg-gray-50'
            }`}
          >
            <UserIcon size={16} color={activeTab === 'profile' ? '#FFFFFF' : '#364153'} />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] whitespace-nowrap">
              プロフィール
            </span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-row items-center px-4 gap-2 h-9 rounded-[10px] transition-colors flex-shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-[#9810FA] text-white'
                : 'bg-transparent text-[#364153] hover:bg-gray-50'
            }`}
          >
            <BellIconAlt size={16} color={activeTab === 'notifications' ? '#FFFFFF' : '#364153'} />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] whitespace-nowrap">
              通知設定
            </span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex flex-row items-center px-4 gap-2 h-9 rounded-[10px] transition-colors flex-shrink-0 ${
              activeTab === 'team'
                ? 'bg-[#9810FA] text-white'
                : 'bg-transparent text-[#364153] hover:bg-gray-50'
            }`}
          >
            <UsersIcon size={16} color={activeTab === 'team' ? '#FFFFFF' : '#364153'} />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] whitespace-nowrap">
              チーム管理
            </span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex flex-row items-center px-4 gap-2 h-9 rounded-[10px] transition-colors flex-shrink-0 ${
              activeTab === 'security'
                ? 'bg-[#9810FA] text-white'
                : 'bg-transparent text-[#364153] hover:bg-gray-50'
            }`}
          >
            <LockIconAlt size={16} color={activeTab === 'security' ? '#FFFFFF' : '#364153'} />
            <span className="text-sm font-normal leading-5 tracking-[-0.150391px] whitespace-nowrap">
              セキュリティ
            </span>
          </button>
        </div>

        {/* Content Section */}
        {activeTab === 'profile' && (
          <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[94.5px] py-6 gap-6 w-full max-w-full">
            {loading && (
              <div className="flex items-center justify-center py-12 w-full">
                <span className="text-sm text-[#6A7282]">読み込み中...</span>
              </div>
            )}
            {!loading && (
              <>
            {/* Profile Information Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                プロフィール情報
              </h2>

              {/* Avatar and Name Section - 모바일: 중앙 정렬, sm 이상: 좌측 정렬 */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 w-full text-center sm:text-left">
                {/* Avatar */}
                <div className="flex items-center justify-center w-20 h-20 bg-[#F3E8FF] rounded-full flex-shrink-0 overflow-hidden">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-normal leading-8 tracking-[0.0703125px] text-[#9810FA]">
                      {(name || '専').trim().charAt(0)}
                    </span>
                  )}
                </div>

                {/* Name, Role and Button */}
                <div className="flex flex-col gap-2 sm:gap-2 items-center sm:items-start">
                  <h3 className="text-xl sm:text-lg font-medium leading-6 sm:leading-6 tracking-[-0.439453px] text-[#101828]">
                    {name || '—'}
                  </h3>
                  
                  {/* Role */}
                  <p className="text-sm sm:text-base font-normal leading-5 sm:leading-4 tracking-[-0.3125px] text-[#4A5565] mb-2">
                    専門家
                  </p>

                  {/* Photo change: hidden file input + button */}
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIconUploading(true);
                      try {
                        const form = new FormData();
                        form.append('file', file);
                        const res = await fetch('/api/expert/settings/profile/icon', {
                          method: 'POST',
                          body: form,
                        });
                        const data = await res.json();
                        if (res.ok && data.iconUrl) {
                          setIconUrl(data.iconUrl);
                        } else {
                          alert(data.error || 'アップロードに失敗しました。');
                        }
                      } catch (err) {
                        console.error(err);
                        alert('アップロードに失敗しました。');
                      } finally {
                        setIconUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={iconUploading}
                    className="px-4 py-2 h-[42px] border border-[#D1D5DC] rounded-[10px] text-sm sm:text-base font-medium leading-6 tracking-[-0.3125px] text-[#0A0A0A] hover:bg-gray-50 transition-colors whitespace-nowrap self-start disabled:opacity-60"
                  >
                    {iconUploading ? 'アップロード中...' : '写真を変更'}
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4 w-full">
                {/* Row 1: Name and Furigana */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      氏名<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      ふりがな<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={furigana}
                      onChange={(e) => setFurigana(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 2: Email and Phone */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      メールアドレス<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      電話番号<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 3: Message (Full Width) */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    ひとことメッセージ
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="プロフィールに表示されるメッセージを入力してください"
                    className="w-full h-[90px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[#99A1AF] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent resize-none"
                  />
                </div>

                {/* 主な取扱い業務（対象となる取組形式） */}
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    主な取扱い業務<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExpertise();
                      }
                    }}
                    placeholder="例: 会社・法人"
                    className="w-full h-[42px] px-4 py-2 text-base font-normal leading-5 tracking-[-0.3125px] text-[#0A0A0A] placeholder:text-[#99A1AF] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddExpertise()}
                    className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#9810FA] hover:underline w-fit"
                  >
                    + 取組を追加
                  </button>
                  {expertiseList.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      {expertiseList.map((expertise, idx) => (
                        <div key={expertise.id} className="flex flex-row items-center gap-2">
                          <span className="text-sm text-[#4A5565] flex-1">{expertise.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpertise(expertise.id)}
                            className="text-sm text-[#C10007] hover:underline"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 4: Office Name (Full Width) */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    事務所名<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  />
                </div>

                {/* Row 5: Office Location (Full Width) */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    事務所所在地<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                  />
                </div>

                {/* Row 6: Registration Number and Affiliation */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      行政書士登録番号<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      所属会<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={affiliation}
                      onChange={(e) => setAffiliation(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 7: Registration Year and Region */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      登録年度
                    </label>
                    <input
                      type="text"
                      value={registrationYear}
                      onChange={(e) => setRegistrationYear(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                      地域
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full h-[42px] px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end w-full mt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || loading || !isProfileRequiredFilled}
                    className="px-4 sm:px-6 py-2 h-10 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '変更を保存'}
                  </button>
                </div>
              </div>
            </div>

            {/* Business Hours Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                営業時間設定
              </h2>
              <div className="flex flex-col gap-3 w-full">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                  const dayLabels: Record<typeof day, string> = {
                    monday: '月曜日',
                    tuesday: '火曜日',
                    wednesday: '水曜日',
                    thursday: '木曜日',
                    friday: '金曜日',
                    saturday: '土曜日',
                    sunday: '日曜日',
                  };
                  const hours = businessHours[day];
                  return (
                    <div
                      key={day}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-3 sm:px-4 py-4 bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] w-full min-w-0 overflow-hidden"
                    >
                      <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153] w-[64px] flex-shrink-0">
                        {dayLabels[day]}
                      </label>
                      <div className="grid grid-cols-[1fr_auto_1fr] sm:flex sm:flex-row items-center gap-2 w-full sm:flex-1 min-w-0">
                        <input
                          type="text"
                          value={hours.start}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.length <= 5) {
                              setBusinessHours({ ...businessHours, [day]: { ...hours, start: val } });
                            }
                          }}
                          onBlur={(e) => {
                            // HH:mm 형식으로 정규화
                            const val = e.target.value.trim();
                            if (val && !/^\d{1,2}:\d{2}$/.test(val)) {
                              const parts = val.split(':');
                              if (parts.length === 2) {
                                const h = parts[0].padStart(2, '0').slice(0, 2);
                                const m = parts[1].padStart(2, '0').slice(0, 2);
                                setBusinessHours({ ...businessHours, [day]: { ...hours, start: `${h}:${m}` } });
                              }
                            }
                          }}
                          placeholder="09:00"
                          disabled={hours.isClosed}
                          className="min-w-0 w-full h-[42px] px-2 sm:px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-50 sm:flex-1"
                        />
                        <span className="text-base text-[#6A7282] flex-shrink-0 px-0.5">〜</span>
                        <input
                          type="text"
                          value={hours.end}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.length <= 5) {
                              setBusinessHours({ ...businessHours, [day]: { ...hours, end: val } });
                            }
                          }}
                          onBlur={(e) => {
                            // HH:mm 형식으로 정규화
                            const val = e.target.value.trim();
                            if (val && !/^\d{1,2}:\d{2}$/.test(val)) {
                              const parts = val.split(':');
                              if (parts.length === 2) {
                                const h = parts[0].padStart(2, '0').slice(0, 2);
                                const m = parts[1].padStart(2, '0').slice(0, 2);
                                setBusinessHours({ ...businessHours, [day]: { ...hours, end: `${h}:${m}` } });
                              }
                            }
                          }}
                          placeholder="18:00"
                          disabled={hours.isClosed}
                          className="min-w-0 w-full h-[42px] px-2 sm:px-4 py-2 text-base font-normal leading-6 tracking-[-0.3125px] text-[#0A0A0A] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-50 sm:flex-1"
                        />
                      </div>
                      <label className="flex flex-row items-center gap-2 text-sm text-[#4A5565] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hours.isClosed}
                          onChange={(e) => {
                            const isClosed = e.target.checked;
                            setBusinessHours({
                              ...businessHours,
                              [day]: { start: isClosed ? '' : '09:00', end: isClosed ? '' : '18:00', isClosed },
                            });
                          }}
                          className="w-4 h-4 rounded border-[#D1D5DC] text-[#9810FA] focus:ring-2 focus:ring-[#9810FA]"
                        />
                        <span>定休日</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Professional Expertise Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                専門分野
              </h2>

              {/* Expertise List */}
              <div className="flex flex-col gap-3 w-full mb-4">
                {expertiseList.map((expertise) => (
                  <div
                    key={expertise.id}
                    className="flex flex-row justify-between items-center px-4 py-3 bg-[#F9FAFB] rounded-[10px]"
                  >
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      {expertise.name}
                    </span>
                    <button
                      onClick={() => handleDeleteExpertise(expertise.id)}
                      className="px-2 py-1 bg-[#FFE2E2] rounded text-xs font-normal leading-4 text-[#C10007] hover:bg-[#FFC9C9] transition-colors"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Expertise */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                <input
                  type="text"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddExpertise();
                    }
                  }}
                  placeholder="新しい専門分野を入力"
                  className="flex-1 h-[42px] px-4 py-2 text-base font-normal leading-5 tracking-[-0.3125px] text-[rgba(10,10,10,0.5)] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                />
                <button
                  onClick={handleAddExpertise}
                  className="px-6 py-2 h-10 bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors whitespace-nowrap w-full sm:w-auto"
                >
                  追加
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Notification Settings Tab */}
        {activeTab === 'notifications' && (
          <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[94.5px] py-6 gap-6 w-full max-w-full">
            {/* Email and LINE Notification Settings Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                通知設定（メールやLINE）
              </h2>

              <div className="flex flex-col gap-4 w-full">
                {/* Deadline Reminder - Special highlighted row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#FFE2E2] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      期限リマインド
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      タスクの期限が近づいたときに通知
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-end sm:justify-between gap-3 w-full sm:w-auto sm:flex-shrink-0">
                    <button className="px-2 py-2 h-[38px] bg-[#364153] rounded-[10px] text-sm font-normal leading-5 tracking-[-0.150391px] text-white hover:bg-[#2A3441] transition-colors whitespace-nowrap">
                      個別管理
                    </button>
                    <ToggleSwitch checked={deadlineReminder} onChange={(val) => { setDeadlineReminder(val); saveNotifications(); }} />
                  </div>
                </div>

                {/* New Case Notification */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      新規案件の通知
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      新しい案件が登録されたときに通知
                    </p>
                  </div>
                  <div className="flex justify-end sm:justify-start w-full sm:w-auto flex-shrink-0">
                    <ToggleSwitch checked={newCaseNotification} onChange={(val) => { setNewCaseNotification(val); saveNotifications(); }} />
                  </div>
                </div>

                {/* Document Upload Notification */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      書類アップロード通知
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      顧客が書類をアップロードしたときに通知
                    </p>
                  </div>
                  <div className="flex justify-end sm:justify-start w-full sm:w-auto flex-shrink-0">
                    <ToggleSwitch
                      checked={documentUploadNotification}
                      onChange={(val) => { setDocumentUploadNotification(val); saveNotifications(); }}
                    />
                  </div>
                </div>

                {/* Message Reception Notification */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      メッセージ受信通知
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      顧客からメッセージが届いたときに通知
                    </p>
                  </div>
                  <div className="flex justify-end sm:justify-start w-full sm:w-auto flex-shrink-0">
                    <ToggleSwitch checked={messageNotification} onChange={(val) => { setMessageNotification(val); saveNotifications(); }} />
                  </div>
                </div>
              </div>
            </div>

            {/* System Notification Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                システム通知
              </h2>

              <div className="flex flex-col gap-4 w-full">
                {/* System Maintenance */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      システムメンテナンス
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      メンテナンス情報を通知
                    </p>
                  </div>
                  <div className="flex justify-end sm:justify-start w-full sm:w-auto flex-shrink-0">
                    <ToggleSwitch checked={systemMaintenance} onChange={(val) => { setSystemMaintenance(val); saveNotifications(); }} />
                  </div>
                </div>

                {/* New Feature Release */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      新機能リリース
                    </h4>
                    <p className="text-xs font-normal leading-4 text-[#4A5565]">
                      新しい機能がリリースされたときに通知
                    </p>
                  </div>
                  <div className="flex justify-end sm:justify-start w-full sm:w-auto flex-shrink-0">
                    <ToggleSwitch checked={newFeatureRelease} onChange={(val) => { setNewFeatureRelease(val); saveNotifications(); }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[94.5px] py-6 gap-6 w-full max-w-full">
            {/* Team Members Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              {/* Header with Title and Add Button */}
              <div className="flex flex-row justify-between items-center gap-3 mb-4 w-full">
                <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828]">
                  チームメンバー
                </h2>
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="flex flex-row items-center px-3 sm:px-4 gap-1.5 sm:gap-2 h-8 sm:h-10 bg-[#9810FA] rounded-[10px] text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <PlusIcon size={16} color="#FFFFFF" className="sm:w-5 sm:h-5" />
                  <span>メンバーを追加</span>
                </button>
              </div>

              {/* Team Members List */}
              {teamLoading ? (
                <div className="flex items-center justify-center py-12 w-full">
                  <span className="text-sm text-[#6A7282]">読み込み中...</span>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="flex items-center justify-center py-12 w-full">
                  <span className="text-sm text-[#6A7282]">メンバーがいません</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-row justify-between items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]"
                    >
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: member.avatarBgColor }}
                        >
                          <span
                            className="text-sm font-normal leading-5 tracking-[-0.150391px]"
                            style={{ color: member.avatarColor }}
                          >
                            {member.name.charAt(0)}
                          </span>
                        </div>

                        {/* Name and Email */}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <h4 className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] truncate">
                            {member.name}
                          </h4>
                          <p className="text-xs font-normal leading-4 text-[#4A5565] truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-2 flex-shrink-0">
                        {/* Role Badge */}
                        <div
                          className="px-3 py-1 rounded text-xs font-normal leading-4"
                          style={{
                            backgroundColor: member.roleBgColor,
                            color: member.roleColor,
                          }}
                        >
                          {member.role === 'administrative-scrivener' ? 'オーナー' : 'アシスタント'}
                        </div>
                        {/* Delete button - only show for assistants */}
                        {member.role !== 'administrative-scrivener' && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="px-2 py-1 text-xs text-[#C10007] hover:text-[#9F0712] transition-colors"
                            title="削除"
                          >
                            <TrashIcon size={16} color="currentColor" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-1">
                権限設定
              </h2>
              <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565] mb-4">
                アシスタントメンバーの権限を設定します
              </p>

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8 w-full">
                  <span className="text-sm text-[#6A7282]">読み込み中...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {/* 案件の作成・編集 */}
                  <label className="flex flex-row justify-between items-center gap-4 px-4 py-3 bg-[#F9FAFB] rounded-[10px] cursor-pointer hover:bg-[#F3F4F6] transition-colors">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      案件の作成・編集
                    </span>
                    <input
                      type="checkbox"
                      checked={canCreateEditCases}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setCanCreateEditCases(newValue);
                        savePermissions({ canCreateEditCases: newValue, canViewCustomerInfo, canApproveDocuments });
                      }}
                      className="w-[13px] h-[13px] rounded border-[#D1D5DC] text-[#9810FA] focus:ring-2 focus:ring-[#9810FA] focus:ring-offset-2 cursor-pointer"
                    />
                  </label>

                  {/* 顧客情報の閲覧 */}
                  <label className="flex flex-row justify-between items-center gap-4 px-4 py-3 bg-[#F9FAFB] rounded-[10px] cursor-pointer hover:bg-[#F3F4F6] transition-colors">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      顧客情報の閲覧
                    </span>
                    <input
                      type="checkbox"
                      checked={canViewCustomerInfo}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setCanViewCustomerInfo(newValue);
                        savePermissions({ canCreateEditCases, canViewCustomerInfo: newValue, canApproveDocuments });
                      }}
                      className="w-[13px] h-[13px] rounded border-[#D1D5DC] text-[#9810FA] focus:ring-2 focus:ring-[#9810FA] focus:ring-offset-2 cursor-pointer"
                    />
                  </label>

                  {/* 書類の承認 */}
                  <label className="flex flex-row justify-between items-center gap-4 px-4 py-3 bg-[#F9FAFB] rounded-[10px] cursor-pointer hover:bg-[#F3F4F6] transition-colors">
                    <span className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                      書類の承認
                    </span>
                    <input
                      type="checkbox"
                      checked={canApproveDocuments}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setCanApproveDocuments(newValue);
                        savePermissions({ canCreateEditCases, canViewCustomerInfo, canApproveDocuments: newValue });
                      }}
                      className="w-[13px] h-[13px] rounded border-[#D1D5DC] text-[#9810FA] focus:ring-2 focus:ring-[#9810FA] focus:ring-offset-2 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[94.5px] py-6 gap-6 w-full max-w-full">
            {/* Password Change Card */}
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                パスワード変更
              </h2>

              <div className="flex flex-col gap-4 w-full">
                {/* Current Password */}
                <div className="flex flex-col items-start gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    現在のパスワード
                  </label>
                  <div className="relative w-full">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <LockIcon size={20} color="#99A1AF" />
                    </div>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-[42px] pl-10 pr-10 text-base font-normal leading-5 tracking-[-0.3125px] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A5565] hover:text-[#101828] transition-colors"
                    >
                      <EyeIcon size={20} color="currentColor" />
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col items-start gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    新しいパスワード
                  </label>
                  <div className="relative w-full">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <LockIcon size={20} color="#99A1AF" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-[42px] pl-10 pr-10 text-base font-normal leading-5 tracking-[-0.3125px] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A5565] hover:text-[#101828] transition-colors"
                    >
                      <EyeIcon size={20} color="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col items-start gap-1 w-full">
                  <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                    新しいパスワード（確認）
                  </label>
                  <div className="relative w-full">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <LockIcon size={20} color="#99A1AF" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-[42px] pl-10 pr-10 text-base font-normal leading-5 tracking-[-0.3125px] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A5565] hover:text-[#101828] transition-colors"
                    >
                      <EyeIcon size={20} color="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Change Password Button */}
                <div className="flex justify-end w-full">
                  <button
                    onClick={handlePasswordChange}
                    className="w-[175.37px] h-10 bg-[#9810FA] rounded-[10px] text-base font-normal leading-6 tracking-[-0.3125px] text-white hover:bg-[#8200DB] transition-colors flex items-center justify-center"
                  >
                    パスワードを変更
                  </button>
                </div>
              </div>
            </div>

            {/* ログイン履歴 - 未実装のため非表示
            <div className="flex flex-col items-start p-4 sm:p-6 w-full bg-white border border-[#E5E7EB] rounded-[10px]">
              <h2 className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#101828] mb-4">
                ログイン履歴
              </h2>

              <div className="flex flex-col gap-3 w-full">
                {loginHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-4 py-4 bg-[#F9FAFB] rounded-[10px]"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <p className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828]">
                        {entry.date} {entry.time}
                      </p>
                      <p className="text-xs font-normal leading-4 text-[#4A5565]">
                        {entry.location} • {entry.device}
                      </p>
                    </div>
                    {entry.isCurrentSession && (
                      <div className="px-3 py-1 bg-[#DCFCE7] rounded text-xs font-normal leading-4 text-[#008236] flex-shrink-0">
                        現在のセッション
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            */}
          </div>
        )}

        {/* Other Tabs Content */}
        {activeTab !== 'profile' && activeTab !== 'notifications' && activeTab !== 'team' && activeTab !== 'security' && (
          <div className="flex flex-col items-center justify-center w-full py-12 px-4 sm:px-6">
            <p className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
              の設定は今後実装予定です
            </p>
          </div>
        )}

        {/* Add Member Modal */}
        {isAddMemberModalOpen && (
          <AddMemberModal
            isOpen={isAddMemberModalOpen}
            onClose={() => {
              setIsAddMemberModalOpen(false);
              setAddMemberTab('email');
              setMemberEmail('');
              setMemberMessage('');
            }}
            activeTab={addMemberTab}
            onTabChange={setAddMemberTab}
            email={memberEmail}
            onEmailChange={setMemberEmail}
            role={memberRole}
            onRoleChange={setMemberRole}
            message={memberMessage}
            onMessageChange={setMemberMessage}
            inviteLink={inviteLink}
            onAdd={handleAddMember}
            onCopyLink={handleCopyLink}
            onShareLink={handleShareLink}
          />
        )}
      </main>
    </div>
  );
}

// Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:ring-offset-2 ${
        checked ? 'bg-[#155DFC]' : 'bg-gray-300'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-[1px] w-[22px] h-[22px] bg-white rounded-full transition-transform duration-200 ${
          checked ? 'right-[1px] transform translate-x-0' : 'left-[1px] transform translate-x-0'
        }`}
      />
    </button>
  );
}
