'use client'

import LoginShortcut from './components/LoginShortcut'
import React, { useState, useEffect } from 'react'
import { signInWithEmail } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { UserIcon, MailIcon, LockIcon, LineIcon } from '@/components/icons'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isHandlingMagicLink, setIsHandlingMagicLink] = useState(false)
    const router = useRouter()

    // LINEログイン後、Supabaseが /login にリダイレクトした場合（#access_token&type=magiclink）はここで setSession して dashboard へ
    useEffect(() => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash
        if (!hash) return
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        if (!accessToken || !refreshToken || type !== 'magiclink') return

        setIsHandlingMagicLink(true)
        const supabase = createClient()
        supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(async ({ data, error: err }) => {
                if (err) {
                    setError('セッションの設定に失敗しました。')
                    setIsHandlingMagicLink(false)
                    return
                }
                if (data.session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('user_type')
                        .eq('id', data.session.user.id)
                        .maybeSingle()
                    const userType = profile?.user_type ?? data.session.user?.user_metadata?.userType
                    let targetPath = '/dashboard'
                    if (userType === 'admin') targetPath = '/admin/management'
                    else if (userType === 'expert' || userType === 'assistant') targetPath = '/expert/dashboard'
                    window.location.href = targetPath
                }
            })
            .catch(() => {
                setError('エラーが発生しました。')
                setIsHandlingMagicLink(false)
            })
    }, [])

    // ログイン処理
    const performLogin = async (loginEmail: string, loginPassword: string) => {
        setError(null)
        setIsLoading(true)

        try {
            await signInWithEmail(loginEmail, loginPassword)

            await new Promise((r) => setTimeout(r, 300))
            const meRes = await fetch('/api/auth/me')
            const meData = meRes.ok ? await meRes.json() : {}
            const userType = meData.userType ?? meData.profile?.user_type ?? 'customer'

            let targetPath = '/dashboard'
            if (userType === 'admin') targetPath = '/admin/management'
            else if (userType === 'expert' || userType === 'assistant') targetPath = '/expert/dashboard'

            window.location.href = targetPath
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ログイン中にエラーが発生しました。ネットワーク接続を確認してください。')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        await performLogin(email, password)
    }

    if (isHandlingMagicLink) {
        return (
            <main className="flex min-h-screen w-full items-center justify-center bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <p className="text-[var(--color-text-secondary)]">ログイン処理中...</p>
            </main>
        )
    }

    return (
        <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                    {/* Header */}
                    <div className="relative flex w-full max-w-[384px] flex-col items-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                            <UserIcon size={32} color="var(--color-primary)" />
                        </div>

                        <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">ログイン</h1>
                        <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">利用者としてログインしてください</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="flex w-full max-w-[384px] flex-col gap-4">
                        {/* Email */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--color-text-secondary)]">メールアドレス</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                                    <MailIcon size={20} />
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white pl-10 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--color-text-secondary)]">パスワード</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                                    <LockIcon size={20} />
                                </span>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white pl-10 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-[10px] bg-red-50 border border-red-200 p-3">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !email.trim() || !password}
                            className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex w-full max-w-[384px] items-center">
                        <div className="flex-1 border-t border-[var(--color-border)]"></div>
                        <span className="px-4 text-sm text-[var(--color-text-secondary)]">または</span>
                        <div className="flex-1 border-t border-[var(--color-border)]"></div>
                    </div>

                    {/* LINE Login Button */}
                    <Link
                        href="/api/auth/line"
                        className="flex h-12 w-full max-w-[384px] items-center justify-center gap-2 rounded-[10px] bg-[#06C755] text-base text-white transition-colors hover:bg-[var(--color-line-hover)]"
                    >
                        <LineIcon size={24} />
                        LINEで始める
                    </Link>

                    {/* Footer Links */}
                    <div className="flex w-full max-w-[384px] flex-col gap-[17.5px] text-center text-sm text-[var(--color-text-secondary)]">
                        <div className="flex flex-col gap-0">
                            <p className="text-[#4a5565]">アカウントをお持ちではありませんか?</p>
                            <Link href="/register" className="text-[var(--color-primary)] hover:underline">
                                新規登録
                            </Link>
                        </div>
                        <Link href="/forgot-password" className="text-[#ee151f] hover:underline">
                            パスワードをお忘れですか?
                        </Link>
                    </div>
                </div>
            </div>

            {/* Login Shortcut Component */}
            <LoginShortcut
                onLogin={performLogin}
                setEmail={setEmail}
                setPassword={setPassword}
            />
        </main>
    )
}
