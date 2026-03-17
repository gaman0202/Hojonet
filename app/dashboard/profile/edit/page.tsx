'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { useProfile } from '@/hooks/useProfile';
import { useProfileStore } from '@/store/useProfileStore';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeftIcon,
  MailIcon,
  LockIcon,
  PhoneIcon,
  ChevronDownIcon,
  HomeIcon,
  DocumentIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
} from '@/components/icons';

// Types & Data
import { FormData } from './types';
import { locations, industries, employeesOptions, businessTypes } from './data';

export default function ProfileEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#155DFC]"></div>
      </div>
    }>
      <ProfileEditPageInner />
    </Suspense>
  );
}

function ProfileEditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterSave = searchParams.get('redirect');
  const { profile, loading: profileLoading } = useProfile();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    businessType: '',
    companyName: '',
    location: '',
    industry: '',
    employees: '',
    representativeName: '',
    contactName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // プロフィールデータを読み込む
  useEffect(() => {
    const loadProfileData = async () => {
      // セッションからメールアドレスを取得
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || profile?.email || '';

      // プロフィールが読み込まれている場合
      if (profile) {
        console.log("profile", profile);
        console.log("profile.phone", profile.phone);
        setFormData({
          email: email,
          password: '',
          passwordConfirm: '',
          name: profile.full_name || '',
          phone: profile.phone || '',
          businessType: profile.business_type || '',
          companyName: profile.company_name || '',
          location: profile.location || '',
          industry: profile.industry || '',
          employees: profile.employees || '',
          representativeName: profile.representative_name || '',
          contactName: profile.contact_name || '',
        });
      }
      // プロフィールがまだ読み込まれていないが、ローディングが完了している場合
      else if (!profileLoading) {
        // セッションからメールアドレスだけを設定
        if (email) {
          setFormData((prev) => ({
            ...prev,
            email: email,
          }));
        }
      }
    };

    loadProfileData();
  }, [profile, profileLoading]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // エラーメッセージをクリア
    if (error) setError(null);
    if (message) setMessage(null);
    if (passwordError) setPasswordError(null);
    if (passwordMessage) setPasswordMessage(null);
  };

  // パスワード強度のバリデーション
  const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };

  // パスワード変更処理（タイムアウト付き）
  const PASSWORD_CHANGE_TIMEOUT_MS = 15000;

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    // バリデーション
    if (!formData.password || !formData.passwordConfirm) {
      setPasswordError('パスワードとパスワード確認の両方を入力してください');
      return;
    }

    if (!isValidPassword(formData.password)) {
      setPasswordError('パスワードは8文字以上で入力してください');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setPasswordError('パスワードが一致しません');
      return;
    }

    setChangingPassword(true);

    // タイムアウト時は reject ではなく resolve してエラーオーバーレイを出さない
    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), PASSWORD_CHANGE_TIMEOUT_MS);
    });

    try {
      // 現在のユーザーIDを取得（最初にチェック）
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setPasswordError('セッションが無効です。再度ログインしてください。');
        return;
      }

      // パスワードを変更（タイムアウトと競争）
      const updatePromise = supabase.auth.updateUser({
        password: formData.password,
      });

      const result = await Promise.race([
        updatePromise.then((r) => ({ timedOut: false as const, ...r })),
        timeoutPromise,
      ]);

      // タイムアウトだった場合
      if ('timedOut' in result && result.timedOut) {
        setPasswordError('リクエストがタイムアウトしました。ネットワークを確認して再度お試しください。');
        return;
      }

      const { error: updateError } = result;

      if (updateError) {
        const msg = updateError.message;
        let errorMessage = msg;
        if (msg.includes('same as') || msg.includes('different from the old') || msg.toLowerCase().includes('new password should be different')) {
          errorMessage = '新しいパスワードは現在のパスワードと異なるものを設定してください。';
        } else if (msg.includes('weak')) {
          errorMessage = 'パスワードが弱すぎます。より強力なパスワードを設定してください。';
        }
        setPasswordError(errorMessage);
        return;
      }

      setPasswordMessage('パスワードが正常に変更されました。');

      // パスワードフィールドをクリア
      setFormData((prev) => ({
        ...prev,
        password: '',
        passwordConfirm: '',
      }));
    } catch (err) {
      console.error('Unexpected error during password change:', err);
      setPasswordError(err instanceof Error ? err.message : '予期せぬエラーが発生しました。');
    } finally {
      setChangingPassword(false);
    }
  };

  // プロフィール保存処理
  const handleSave = async () => {
    setError(null);
    setMessage(null);

    setSaving(true);

    try {
      // 現在のユーザーIDを取得（最初にチェック）
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('セッションが無効です。再度ログインしてください。');
        setSaving(false);
        return;
      }

      // profilesテーブルを更新（NOT NULL カラムは空文字で送る）
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name?.trim() || null,
          phone: formData.phone?.trim() ?? '',
          company_name: formData.companyName?.trim() || null,
          business_type: formData.businessType?.trim() ?? '',
          location: formData.location?.trim() ?? '',
          industry: formData.industry?.trim() ?? '',
          employees: formData.employees?.trim() ?? '',
          representative_name: formData.representativeName?.trim() || null,
          contact_name: formData.contactName?.trim() || null,
        })
        .eq('id', session.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        setError('プロフィールの更新に失敗しました。');
        setSaving(false);
        return;
      }

      setMessage('プロフィールが正常に更新されました。');

      // ストアを再取得してからリダイレクト（遷移先で最新が表示される）
      await useProfileStore.getState().fetchProfile();

      // 2秒後にリダイレクト（redirect パラメータがあればそちら、なければプロフィールページ）
      setTimeout(() => {
        router.push(redirectAfterSave || '/dashboard/profile');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error during save:', err);
      setError('予期せぬエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB] lg:bg-white">
      <Sidebar activeItem="profile" />

      {/* Main Content */}
      <main className="flex flex-col items-start px-4 lg:px-12 pt-6 lg:py-12 pb-24 lg:pb-12 gap-6 lg:gap-6 flex-grow min-w-0 w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-row items-center gap-2 w-full pb-4 border-b border-[#E5E7EB]">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-5 h-5 flex items-center justify-center"
          >
            <ArrowLeftIcon size={20} color="#4A5565" />
          </button>
          <span className="text-sm font-medium leading-5 tracking-[-0.150391px] text-[#4A5565]">
            マイページに戻る
          </span>
        </div>

        {/* Desktop Back Button */}
        <div className="hidden lg:flex flex-row items-center gap-2 w-full">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="flex flex-row items-center gap-2"
          >
            <ArrowLeftIcon size={20} color="#4A5565" />
            <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
              マイページに戻る
            </span>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-[30px] font-normal lg:font-normal leading-8 lg:leading-[36px] tracking-[0.0703125px] lg:tracking-[0.395508px] text-[#101828] w-full">
          プロフィール編集
        </h1>

        {/* Form Container */}
        <div className="flex flex-col items-start px-4 lg:px-8 py-6 lg:py-8 gap-6 lg:gap-6 w-full bg-white border border-[#E5E7EB] rounded-2xl lg:rounded-2xl">
          {/* Form */}
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-center gap-4 lg:gap-4 w-full">
            {/* Email - Full Width */}
            <div className="flex flex-col gap-2 lg:gap-2 w-full lg:w-full">
              <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                メールアドレス<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative w-full">
                <MailIcon
                  size={20}
                  color="#99A1AF"
                  className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="w-full pl-10 lg:pl-12 pr-4 lg:pr-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-gray-50 border border-[#D1D5DC] rounded-[10px] cursor-not-allowed opacity-60"
                />
              </div>
            </div>

            {/* Password - Left, Password Confirm - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  パスワード
                </label>
                <div className="relative w-full">
                  <LockIcon
                    size={20}
                    color="#99A1AF"
                    className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎"
                    className="w-full pl-10 lg:pl-12 pr-12 lg:pr-12 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[#0A0A0A]/50 bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-[#99A1AF] hover:text-[#4A5565] transition-colors"
                  >
                    {showPassword ? <EyeOffIcon size={20} color="currentColor" /> : <EyeIcon size={20} color="currentColor" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  パスワード確認
                </label>
                <div className="relative w-full">
                  <LockIcon
                    size={20}
                    color="#99A1AF"
                    className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={formData.passwordConfirm}
                    onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                    placeholder="⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎ ⚫︎"
                    className="w-full pl-10 lg:pl-12 pr-12 lg:pr-12 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[#0A0A0A]/50 bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((v) => !v)}
                    aria-label={showPasswordConfirm ? 'パスワード確認を隠す' : 'パスワード確認を表示'}
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-[#99A1AF] hover:text-[#4A5565] transition-colors"
                  >
                    {showPasswordConfirm ? <EyeOffIcon size={20} color="currentColor" /> : <EyeIcon size={20} color="currentColor" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Success Message */}
            {passwordMessage && (
              <div className="w-full rounded-[10px] bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-600 text-center">{passwordMessage}</p>
              </div>
            )}

            {/* Password Error Message */}
            {passwordError && (
              <div className="w-full rounded-[10px] bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600 text-center">{passwordError}</p>
              </div>
            )}

            {/* Name - Left, Phone - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  お名前<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 lg:px-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  連絡先（電話番号）<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative w-full">
                  <PhoneIcon
                    size={20}
                    color="#99A1AF"
                    className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="090-1234-5678"
                    className="w-full pl-10 lg:pl-12 pr-4 lg:pr-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] placeholder:text-[#0A0A0A]/50 bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Business Type - Left, Company Name - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:w-[504px]">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  事業形態
                </label>
                <div className="relative w-full">
                  <select
                    value={formData.businessType ?? ''}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 pr-10 lg:pr-10 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                  >
                    <option value="">選択してください</option>
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Company Name - Left, Location - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  会社名(事業形態抜き)
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-4 lg:px-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  所在地
                </label>
                <div className="relative w-full">
                  <select
                    value={formData.location ?? ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 pr-10 lg:pr-10 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                  >
                    <option value="">選択してください</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Representative Name - Left, Contact Name - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  代表者名
                </label>
                <input
                  type="text"
                  value={formData.representativeName}
                  onChange={(e) => handleInputChange('representativeName', e.target.value)}
                  placeholder="田中太郎"
                  className="w-full px-4 lg:px-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  担当者名
                  <span className="text-red-500 ml-1 text-xs">（代表者名か担当者名、いずれか必須）</span>
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="田中花子"
                  className="w-full px-4 lg:px-4 py-3 lg:py-3 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                />
              </div>
            </div>

            {/* Industry - Left, Employees - Right */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 w-full">
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  業種
                </label>
                <div className="relative w-full">
                  <select
                    value={formData.industry ?? ''}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 pr-10 lg:pr-10 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                  >
                    <option value="">選択してください</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:flex-1">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  従業員数
                </label>
                <div className="relative w-full">
                  <select
                    value={formData.employees ?? ''}
                    onChange={(e) => handleInputChange('employees', e.target.value)}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 pr-10 lg:pr-10 text-base font-normal leading-5 lg:leading-6 tracking-[-0.3125px] text-[#101828] bg-white border border-[#D1D5DC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent appearance-none"
                  >
                    <option value="">選択してください</option>
                    {employeesOptions.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    size={20}
                    color="#4A5565"
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* LINE通知 안내 섹션 */}
            {profile?.line_id && (
              <div className="flex flex-col gap-2 lg:gap-2 w-full lg:w-full border-t border-[#E5E7EB] pt-6 mt-2">
                <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#4A5565]">
                  LINE通知
                </label>
                <div className="flex flex-col gap-3">
                  <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-[10px]">
                    <p className="text-sm text-blue-700">
                      LINEでログインしているため、タスクの期限リマインダーをLINEで自動的に受け取ることができます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="w-full rounded-[10px] bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-600 text-center">{message}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full rounded-[10px] bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Password Change Button and Save Button */}
            <div className="flex flex-col lg:flex-row justify-center lg:justify-center items-center gap-4 lg:gap-4 w-full lg:w-full mt-2 lg:mt-0">
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !!passwordMessage || !formData.password || !formData.passwordConfirm || formData.password !== formData.passwordConfirm}
                className="w-full lg:w-auto px-20 lg:px-20 py-3 lg:py-3 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white">
                  {changingPassword ? '変更中...' : 'パスワードを変更'}
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!message || profileLoading || !formData.name?.trim() || (!formData.representativeName?.trim() && !formData.contactName?.trim())}
                className="w-full lg:w-auto px-20 lg:px-20 py-3 lg:py-3 bg-[#155DFC] rounded-[10px] hover:bg-[#1447E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-base font-normal leading-6 tracking-[-0.3125px] text-white">
                  {saving ? '保存中...' : '保存する'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-row justify-around items-center h-16 bg-white border-t border-[#E5E7EB] z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <HomeIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ホーム</span>
        </Link>
        <Link href="/dashboard/cases" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <DocumentIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">案件</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <UserIcon size={20} color="#155DFC" />
          <span className="text-xs text-[#155DFC] leading-4">マイページ</span>
        </Link>
        <Link href="/logout" className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
          <LogOutIcon size={20} color="#6A7282" />
          <span className="text-xs text-[#6A7282] leading-4">ログアウト</span>
        </Link>
      </nav>
    </div>
  );
}
