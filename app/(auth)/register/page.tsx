'use client'

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpWithEmail, validatePassword } from "@/lib/auth";
import { UserIcon, MailIcon, LockIcon, ChevronDownIcon } from "@/components/icons";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)] flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
      </main>
    }>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const emailFromQuery = searchParams.get('email') ?? '';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // query に email がある場合はメール入力欄を変更不可にする
  const isEmailLocked = Boolean(emailFromQuery);

  // 招待トークン情報
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    role: string;
    group_id: string;
    case_id: number;
    inviter_name: string;
  } | null>(null);

  // 招待トークンの検証
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    fetch(`/api/invite/verify?token=${encodeURIComponent(inviteToken)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.valid) setInviteInfo(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [inviteToken]);

  // フォームの状態管理
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    businessType: '',
    companyName: '',
    location: '',
    industry: '',
    employees: '',
    representativeName: '',
    contactName: '',
  });

  // 初期表示時: query に email がある場合はメール欄にセット（変更不可）
  useEffect(() => {
    if (emailFromQuery) {
      setFormData(prev => ({ ...prev, email: emailFromQuery }));
    }
  }, [emailFromQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && isEmailLocked) return;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'password' || name === 'confirmPassword') setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // バリデーション
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません。');
      setIsLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(' '));
      setIsLoading(false);
      return;
    }

    try {
      // 招待リンクの場合: userType = member/introducer, groupId = 招待者のグループID
      const userType = inviteInfo ? inviteInfo.role : 'customer';
      const metadata: Record<string, string> = {
        name: formData.name,
        companyName: formData.companyName,
        businessType: formData.businessType,
        location: formData.location,
        industry: formData.industry,
        employees: formData.employees,
        representativeName: formData.representativeName,
        contactName: formData.contactName,
        userType,
      };
      if (inviteInfo) {
        metadata.groupId = inviteInfo.group_id;
      }

      const { user, session } = await signUpWithEmail({
        email: formData.email,
        password: formData.password,
        metadata,
      });

      // 招待トークンを使用済みにし、case_members に追加
      if (inviteToken && user) {
        await fetch('/api/invite/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken, user_id: user.id }),
        });
      }

      setSuccess(true);
      if (user && session) {
        // プロフィールの user_type でリダイレクト（expert チーム招待の assistant は handle_new_user で設定済み）
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();
        const userType = profile?.user_type;
        const targetPath =
          userType === 'admin' ? '/admin/management' :
          userType === 'expert' || userType === 'assistant' ? '/expert/dashboard' :
          '/dashboard';
        router.push(targetPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 登録成功時の表示
  if (success) {
    return (
      <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
          <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl text-[var(--color-text-primary)]">登録完了</h1>
            <p className="text-center text-[var(--color-text-secondary)]">
              確認メールを送信しました。<br />
              メール内のリンクをクリックして登録を完了してください。
            </p>
            <Link
              href="/login"
              className="mt-4 h-12 w-full flex items-center justify-center rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              ログインページへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
        {/* Card */}
        <div className="flex w-full max-w-[448px] flex-col items-center rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
          {/* Header */}
          <div className="relative flex w-full max-w-[384px] flex-col items-center mb-9">
            {/* Icon circle */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
              <UserIcon size={32} color="var(--color-primary)" />
            </div>

            <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">
              {inviteInfo ? 'メンバー登録' : '新規登録'}
            </h1>

            <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">
              {inviteInfo
                ? `${inviteInfo.inviter_name || ''}さんからの招待です`
                : '利用者として登録してください'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex w-full max-w-[384px] flex-col gap-4" noValidate>
            {/* 送信時エラー（フォーム最上部で表示） */}
            {error && (
              <div className="rounded-[10px] bg-red-50 border border-red-200 p-3" role="alert">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Email */}
            <Field label="メールアドレス" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <MailIcon size={20} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tanaka@techstart.co.jp"
                  required
                  readOnly={isEmailLocked}
                  disabled={isEmailLocked}
                  aria-readonly={isEmailLocked}
                  className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white pl-10 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)] disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </Field>

            {/* Password */}
            <Field label="パスワード" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <LockIcon size={20} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="パスワード"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`h-[50px] w-full rounded-[10px] border bg-white pl-10 pr-12 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] ${
                    formData.password.length > 0 && !validatePassword(formData.password).isValid
                      ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]'
                  }`}
                />
                {/* Show/Hide */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>
            {/* パスワード要件：未入力時は1行の説明、1文字以上入力時は未満足項目を箇条書き（満たすたびに減る） */}
            {formData.password.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] px-1">
                8文字以上、大/小文字、数字、特殊文字(@$!%*?&)を含む
              </p>
            ) : (
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1 px-1">
                {(validatePassword(formData.password).errors).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}

            {/* Confirm Password */}
            <Field label="パスワード（確認）" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <LockIcon size={20} />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="パスワード（確認）"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`h-[50px] w-full rounded-[10px] border bg-white pl-10 pr-12 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] ${
                    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]'
                  }`}
                />
                {/* Show/Hide */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'パスワード（確認）を隠す' : 'パスワード（確認）を表示'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {/* 確認パスワードの一致表示：入力ありのときだけ表示 */}
            {formData.confirmPassword.length > 0 && (
              <p
                className={`text-sm px-1 ${
                  formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formData.password === formData.confirmPassword ? '一致しています。' : '一致しません。'}
              </p>
            )}

            {/* Name */}
            <Field label="お名前" required>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="田中太郎"
                required
                className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
              />
            </Field>

            {/* Business type */}
            <Field label="事業形態">
              <Select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                options={["株式会社", "合同会社", "個人事業主", "創業予定"]}
                placeholder="選択してください"
              />
            </Field>

            {/* Company name */}
            <Field label="会社名（事業形態抜き）">
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="テックスタート"
                className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
              />
            </Field>

            {/* Location */}
            <Field label="所在地">
              <Select
                name="location"
                value={formData.location}
                onChange={handleChange}
                options={[
                  "東京都",
                  "大阪府",
                  "神奈川県",
                  "愛知県",
                  "埼玉県",
                  "千葉県",
                  "兵庫県",
                  "北海道",
                  "福岡県",
                  "その他",
                ]}
                placeholder="選択してください"
              />
            </Field>

            {/* Industry */}
            <Field label="業種">
              <Select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                options={[
                  "製造業",
                  "IT・情報通信業",
                  "サービス業",
                  "小売業",
                  "卸売業",
                  "飲食業",
                  "建設業",
                  "医療・福祉",
                  "教育",
                  "その他",
                ]}
                placeholder="選択してください"
              />
            </Field>

            {/* Employees */}
            <Field label="従業員数">
              <Select
                name="employees"
                value={formData.employees}
                onChange={handleChange}
                options={["1〜5名", "6〜10名", "11〜30名", "31〜100名", "101名以上"]}
                placeholder="選択してください"
              />
            </Field>

            {/* Representative Name / Contact Name */}
            <Field label="代表者名・担当者名">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">代表者名</span>
                  <input
                    type="text"
                    name="representativeName"
                    value={formData.representativeName}
                    onChange={handleChange}
                    placeholder="田中太郎"
                    className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">担当者名 <span className="text-red-500">*</span><span className="text-[var(--color-text-secondary)]">（代表者名か担当者名、いずれか必須）</span></span>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    placeholder="田中花子"
                    className={`h-[50px] w-full rounded-[10px] border bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] ${
                      !formData.representativeName.trim() && !formData.contactName.trim()
                        ? 'border-[var(--color-border)]'
                        : 'border-[var(--color-border)]'
                    } focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]`}
                  />
                </div>
              </div>
            </Field>
            {!formData.representativeName.trim() && !formData.contactName.trim() && (
              <p className="text-xs text-red-500 px-1">代表者名または担当者名を入力してください。</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                !formData.email.trim() ||
                !formData.password ||
                !formData.confirmPassword ||
                !formData.name.trim() ||
                !validatePassword(formData.password).isValid ||
                formData.password !== formData.confirmPassword ||
                (!formData.representativeName.trim() && !formData.contactName.trim())
              }
              className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '登録中...' : '登録する'}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-9 w-full max-w-[384px] text-center text-sm text-[var(--color-text-secondary)]">
            <span>すでにアカウントをお持ちですか？ </span>
            <Link href="/login" className="text-[var(--color-primary)] hover:underline">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="h-[47px] w-full appearance-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 pr-10 text-base text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
      >
        <option value="" className="text-[var(--color-text-tertiary)]">
          {placeholder}
        </option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {/* Chevron */}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
        <ChevronDownIcon size={20} />
      </span>
    </div>
  );
}

/** 👁 show/hide icons (no extra imports) */
function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.88 5.1A10.3 10.3 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-3.26 4.22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.11 6.11C3.7 8.06 2 12 2 12s3.5 7 10 7c1.04 0 2.03-.17 2.95-.47"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
