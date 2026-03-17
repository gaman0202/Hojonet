'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  EnvelopeIcon,
  PhoneCallIcon,
  BuildingIcon,
  LocationIcon,
} from '@/components/icons';

/* ---------- Types ---------- */
interface GroupMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  location: string;
  userType: string;
  userTypeLabel: string;
  nameInitial: string;
}

interface UserGroup {
  groupId: string;
  groupName: string;
  groupType: 'customer' | 'expert';
  activeCases: number;
  members: GroupMember[];
}

/** フラット一覧用（ユーザータブ・専門家タブ） */
interface UserProfileRow extends GroupMember {
  groupId?: string;
  groupName?: string;
  activeCases?: number;
}

/* ---------- Badge ---------- */
const USER_TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  customer: { bg: '#DBEAFE', text: '#1447E6' },
  member: { bg: '#E5E7EB', text: '#364153' },
  introducer: { bg: '#FFE2E2', text: '#C10007' },
  expert: { bg: '#F3E8FF', text: '#9810FA' },
  assistant: { bg: '#FEF3C7', text: '#92400E' },
};

/* ---------- Add User Modal ---------- */
function AddUserModal({
  onClose,
  onSuccess,
  existingGroups,
}: {
  onClose: () => void;
  onSuccess: () => void;
  existingGroups: UserGroup[];
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [userType, setUserType] = useState('customer');
  const [groupId, setGroupId] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsGroup = userType === 'member' || userType === 'assistant' || userType === 'introducer';
  const groupOptions = useMemo(() => {
    if (userType === 'member' || userType === 'introducer') return existingGroups.filter((g) => g.groupType === 'customer');
    if (userType === 'assistant') return existingGroups.filter((g) => g.groupType === 'expert');
    return [];
  }, [userType, existingGroups]);

  const filteredGroupOptions = useMemo(() => {
    const q = groupSearchQuery.trim().toLowerCase();
    if (!q) return groupOptions;
    return groupOptions.filter((g) => {
      const nameMatch = g.groupName.toLowerCase().includes(q);
      const memberMatch = g.members.some(
        (m) =>
          (m.fullName && m.fullName.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.companyName && m.companyName.toLowerCase().includes(q))
      );
      return nameMatch || memberMatch;
    });
  }, [groupOptions, groupSearchQuery]);

  const selectedGroup = useMemo(() => groupOptions.find((g) => g.groupId === groupId), [groupOptions, groupId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputClass =
    'px-3 py-2.5 text-sm text-[#101828] border border-[#D1D5DC] rounded-[10px] focus:ring-2 focus:ring-[#9810FA] focus:border-transparent placeholder:text-[#99A1AF] bg-white';

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードは必須です');
      return;
    }
    if (password.trim().length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (needsGroup && !groupId) {
      setError(userType === 'introducer' ? '紹介先の顧客グループを選択してください' : '所属グループを選択してください');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || undefined,
          companyName: companyName.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          industry: industry.trim() || undefined,
          userType,
          groupId: needsGroup ? groupId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ユーザーの追加に失敗しました。');
        return;
      }
      onSuccess();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] w-full max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#101828]">ユーザーを追加</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <XIcon size={20} color="#6A7282" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#364153]">ユーザー種別 <span className="text-red-500">*</span></label>
            <select
              value={userType}
              onChange={(e) => { setUserType(e.target.value); setGroupId(''); setGroupSearchQuery(''); setGroupDropdownOpen(false); }}
              className="px-3 py-2.5 text-sm text-[#101828] border border-[#D1D5DC] rounded-[10px] focus:ring-2 focus:ring-[#9810FA] focus:border-transparent placeholder:text-[#99A1AF] bg-white"
            >
              <option value="customer">申請者（顧客）</option>
              <option value="member">メンバー（顧客チーム）</option>
              <option value="introducer">紹介者（顧客に紐づく）</option>
              <option value="expert">専門家</option>
              <option value="assistant">アシスタント（専門家チーム）</option>
            </select>
          </div>
          {needsGroup && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">
                {userType === 'assistant' ? '追加先の専門家グループ' : userType === 'introducer' ? '紹介先の顧客グループ' : '追加先の顧客グループ'}
                <span className="text-red-500"> *</span>
              </label>
              {groupOptions.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-[10px] border border-amber-200">
                  {userType === 'assistant'
                    ? '専門家グループがありません。先に「専門家」を1件追加してください。'
                    : '顧客グループがありません。先に「申請者（顧客）」を1件追加してください。'}
                </p>
              ) : (
                <div ref={groupDropdownRef} className="relative">
                  <div className="flex flex-col gap-1">
                    <div className="flex rounded-[10px] border border-[#D1D5DC] bg-white focus-within:ring-2 focus-within:ring-[#9810FA] focus-within:border-transparent">
                      <span className="flex items-center pl-3 text-[#6A7282]">
                        <SearchIcon size={16} color="#6A7282" />
                      </span>
                      <input
                        type="text"
                        value={groupDropdownOpen ? groupSearchQuery : (selectedGroup ? `${selectedGroup.groupName}（${selectedGroup.members.length}名）` : '')}
                        onChange={(e) => { setGroupSearchQuery(e.target.value); setGroupDropdownOpen(true); if (!e.target.value) setGroupId(''); }}
                        onFocus={() => setGroupDropdownOpen(true)}
                        placeholder="グループ名・会社名・メールで検索..."
                        className="flex-1 px-2 py-2.5 text-sm text-[#101828] placeholder:text-[#99A1AF] bg-transparent border-0 focus:outline-none focus:ring-0"
                      />
                      {selectedGroup && !groupDropdownOpen && (
                        <button
                          type="button"
                          onClick={() => { setGroupId(''); setGroupSearchQuery(''); setGroupDropdownOpen(true); }}
                          className="pr-2 text-[#6A7282] hover:text-[#101828]"
                          aria-label="選択を解除"
                        >
                          <XIcon size={14} color="currentColor" />
                        </button>
                      )}
                    </div>
                  </div>
                  {groupDropdownOpen && (
                    <ul
                      className="absolute z-10 mt-1 w-full max-h-[220px] overflow-y-auto bg-white border border-[#D1D5DC] rounded-[10px] shadow-lg py-1"
                      role="listbox"
                    >
                      {filteredGroupOptions.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-[#6A7282]">該当するグループがありません</li>
                      ) : (
                        filteredGroupOptions.map((g) => (
                          <li
                            key={g.groupId}
                            role="option"
                            aria-selected={groupId === g.groupId}
                            onClick={() => { setGroupId(g.groupId); setGroupSearchQuery(''); setGroupDropdownOpen(false); }}
                            className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-[#F3E8FF] ${groupId === g.groupId ? 'bg-[#F3E8FF] text-[#9810FA]' : 'text-[#101828]'}`}
                          >
                            <span className="font-medium">{g.groupName}</span>
                            <span className="text-[#6A7282] ml-1">（{g.members.length}名）</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">メール <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">パスワード <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">氏名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田太郎"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">会社名</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="株式会社サンプル"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">電話番号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-1234-5678"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#364153]">業種</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="IT・テクノロジー"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#364153]">所在地</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="東京都渋谷区..."
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-[#364153] bg-white border border-[#D1D5DC] rounded-[10px] hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              saving ||
              !email.trim() ||
              !password.trim() ||
              password.trim().length < 8 ||
              (needsGroup && !groupId)
            }
            className="px-4 py-2.5 text-sm text-white bg-[#9810FA] rounded-[10px] hover:bg-[#8200DB] transition-colors disabled:opacity-50"
          >
            {saving ? '追加中...' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ユーザー/専門家 フラット一覧の1行 ---------- */
function ProfileRow({ profile }: { profile: UserProfileRow }) {
  const badge = USER_TYPE_BADGE[profile.userType] ?? { bg: '#E5E7EB', text: '#364153' };
  return (
    <div className="w-full bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0 sm:w-[220px] flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F3F4F6] flex-shrink-0">
            <span className="text-sm text-[#6A7282]">{profile.nameInitial}</span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium text-[#101828] truncate">{profile.fullName}</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] leading-3.5 whitespace-nowrap w-fit"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {profile.userTypeLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#6A7282] sm:flex-1 min-w-0 pl-12 sm:pl-0">
          {profile.email && (
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <EnvelopeIcon size={14} color="#99A1AF" className="flex-shrink-0" />
              {profile.email}
            </span>
          )}
          {profile.phone && (
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <PhoneCallIcon size={14} color="#99A1AF" className="flex-shrink-0" />
              {profile.phone}
            </span>
          )}
          {profile.companyName && (
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <BuildingIcon size={14} color="#99A1AF" className="flex-shrink-0" />
              {profile.companyName}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <LocationIcon size={14} color="#99A1AF" className="flex-shrink-0" />
              {profile.location}
            </span>
          )}
          {profile.groupName && (
            <span className="flex items-center gap-1.5 min-w-0 truncate text-[#99A1AF]">
              所属: {profile.groupName}
            </span>
          )}
          {typeof profile.activeCases === 'number' && profile.activeCases > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#DCFCE7] text-xs text-[#008236] whitespace-nowrap">
              進行中 {profile.activeCases}件
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function AdminCustomersPage() {
  const [customerGroups, setCustomerGroups] = useState<UserGroup[]>([]);
  const [expertGroups, setExpertGroups] = useState<UserGroup[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfileRow[]>([]);
  const [expertProfiles, setExpertProfiles] = useState<UserProfileRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalExperts, setTotalExperts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'experts'>('users');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'リクエストに失敗しました。');
      }
      const data = await res.json();
      setCustomerGroups(data.customerGroups ?? []);
      setExpertGroups(data.expertGroups ?? []);
      setUserProfiles(data.userProfiles ?? []);
      setExpertProfiles(data.expertProfiles ?? []);
      setTotalUsers(data.totalUsers ?? 0);
      setTotalExperts(data.totalExperts ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeProfiles = activeTab === 'users' ? userProfiles : expertProfiles;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeProfiles;
    return activeProfiles.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.companyName && p.companyName.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
    );
  }, [activeProfiles, searchQuery]);

  const allGroups = useMemo(() => [...customerGroups, ...expertGroups], [customerGroups, expertGroups]);

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="customers" />

      <main className="flex flex-col items-start w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col items-start px-4 lg:px-6 pt-4 lg:pt-6 pb-4 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row items-center justify-between w-full gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl lg:text-[30px] font-normal leading-7 lg:leading-9 tracking-[0.395508px] text-[#101828]">
                顧客管理
              </h1>
              <p className="text-sm lg:text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#4A5565]">
                ユーザー {totalUsers}名 / 専門家 {totalExperts}名
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-row items-center gap-2 px-4 py-2.5 bg-[#9810FA] text-white text-sm rounded-[10px] hover:bg-[#8200DB] transition-colors whitespace-nowrap"
            >
              <PlusIcon size={16} color="#FFFFFF" />
              <span className="hidden sm:inline">ユーザー追加</span>
            </button>
          </div>
        </div>

        {/* Tab + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 lg:px-6 py-4 w-full bg-white border-b border-[#E5E7EB]">
          <div className="flex flex-row rounded-[10px] border border-[#D1D5DC] overflow-hidden flex-shrink-0">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm transition-colors ${activeTab === 'users' ? 'bg-[#9810FA] text-white' : 'bg-white text-[#364153] hover:bg-gray-50'}`}
            >
              ユーザー ({userProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('experts')}
              className={`px-4 py-2 text-sm transition-colors border-l border-[#D1D5DC] ${activeTab === 'experts' ? 'bg-[#9810FA] text-white' : 'bg-white text-[#364153] hover:bg-gray-50'}`}
            >
              専門家 ({expertProfiles.length})
            </button>
          </div>
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon size={18} color="#99A1AF" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前、メール、会社名で検索..."
              className="w-full pl-9 pr-4 py-2.5 text-sm text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-4 lg:px-6 py-6 pb-24 lg:pb-6 gap-3 w-full flex-grow">
          {loading && (
            <div className="w-full text-center py-12 text-[#4A5565]">読み込み中...</div>
          )}
          {error && (
            <div className="w-full text-center py-12 text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="w-full text-center py-12 text-[#4A5565]">
              {searchQuery ? '検索結果がありません' : activeTab === 'users' ? 'ユーザーがありません' : '専門家がありません'}
            </div>
          )}
          {!loading && !error && filtered.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} />
          ))}
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
          existingGroups={allGroups}
        />
      )}
    </div>
  );
}
