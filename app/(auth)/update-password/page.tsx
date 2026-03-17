'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updatePassword, validatePassword, signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserIcon, LockIcon } from '@/components/icons'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()
        const establishSession = async () => {
            try {
                const hash = window.location.hash
                const hashParams = new URLSearchParams(hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const type = hashParams.get('type')

                const params = new URLSearchParams(window.location.search)
                const finalAccessToken = accessToken || params.get('access_token')
                const finalRefreshToken = refreshToken || params.get('refresh_token')
                const finalType = type || params.get('type')

                if (finalAccessToken && finalRefreshToken && finalType === 'recovery') {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: finalAccessToken,
                        refresh_token: finalRefreshToken,
                    })
                    if (error) {
                        setError('認証に失敗しました。リンクが無効または期限切れの可能性があります。')
                        setIsAuthenticating(false)
                        return
                    }
                    if (data.session) {
                        setIsAuthenticated(true)
                        router.replace('/update-password')
                    }
                } else {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                        setIsAuthenticated(true)
                    } else {
                        setError('認証リンクが無効です。パスワードリセットメールから再度アクセスしてください。')
                    }
                }
            } catch (err) {
                setError('認証処理中にエラーが発生しました。')
            } finally {
                setIsAuthenticating(false)
            }
        }

        establishSession()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) setIsAuthenticated(true)
            else if (event === 'SIGNED_OUT') setIsAuthenticated(false)
        })
        return () => subscription.unsubscribe()
    }, [router])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)
        setError(null)

        if (!password || !confirmPassword) {
            setError('すべての項目を入力してください')
            return
        }

        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
            setError(passwordValidation.errors.join(' '))
            return
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません')
            return
        }

        setLoading(true)
        try {
            await updatePassword(password)
            await signOut()
            setMessage('パスワードが正常に更新されました。新しいパスワードでログインできます。')
            setPassword('')
            setConfirmPassword('')
        } catch (err) {
            setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました。')
        } finally {
            setLoading(false)
        }
    }

    if (isAuthenticating) {
        return (
            <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                    <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                        <div className="relative flex w-full max-w-[384px] flex-col items-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                                <UserIcon size={32} color="var(--color-primary)" />
                            </div>
                            <p className="mt-4 text-center text-base text-[var(--color-text-secondary)]">認証中... しばらくお待ちください</p>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // パスワード変更成功後は signOut するため isAuthenticated が false になる。成功メッセージがあるときは成功画面を表示
    if (message) {
        return (
            <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                    <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-center text-2xl text-[var(--color-text-primary)]">パスワードを更新しました</h1>
                        <p className="text-center text-base text-[var(--color-text-secondary)]">{message}</p>
                        <Link
                            href="/login"
                            className="h-12 w-full max-w-[384px] rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] flex items-center justify-center"
                        >
                            ログインページへ
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                    <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                        <div className="relative flex w-full max-w-[384px] flex-col items-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                                <UserIcon size={32} color="var(--color-primary)" />
                            </div>
                            <h1 className="mt-4 text-center text-2xl font-semibold text-[var(--color-text-primary)]">認証が必要です</h1>
                            <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">パスワードリセットメールからアクセスしてください</p>
                        </div>
                        {error && (
                            <div className="w-full max-w-[384px] rounded-[10px] bg-red-50 border border-red-200 p-4">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}
                        <Link
                            href="/forgot-password"
                            className="h-12 w-full max-w-[384px] rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] flex items-center justify-center"
                        >
                            パスワードリセットメールを再送信
                        </Link>
                        <div className="w-full max-w-[384px] text-center text-sm text-[var(--color-text-secondary)]">
                            <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                                ログインページに戻る
                            </Link>
                        </div>
                    </div>
                </div>
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

                        <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">パスワードを更新</h1>
                        <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">新しいパスワードを入力してください</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleUpdatePassword} className="flex w-full max-w-[384px] flex-col gap-4">
                        {/* New Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--color-text-secondary)]">新しいパスワード</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                                    <LockIcon size={20} />
                                </span>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        setError(null)
                                    }}
                                    className={`h-[50px] w-full rounded-[10px] border bg-white pl-10 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] ${
                                        password.length > 0 && !validatePassword(password).isValid
                                            ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                                            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]'
                                    }`}
                                    placeholder=""
                                    required
                                    disabled={loading || !!message}
                                />
                            </div>
                            {password.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-secondary)] px-1">
                                    8文字以上、大/小文字、数字、特殊文字(@$!%*?&)を含む
                                </p>
                            ) : (
                                <ul className="list-disc list-inside text-sm text-red-600 space-y-1 px-1">
                                    {validatePassword(password).errors.map((msg) => (
                                        <li key={msg}>{msg}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--color-text-secondary)]">パスワード（確認）</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                                    <LockIcon size={20} />
                                </span>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value)
                                        setError(null)
                                    }}
                                    className={`h-[50px] w-full rounded-[10px] border bg-white pl-10 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] ${
                                        confirmPassword.length > 0 && password !== confirmPassword
                                            ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                                            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]'
                                    }`}
                                    placeholder=""
                                    required
                                    disabled={loading || !!message}
                                />
                            </div>
                            {confirmPassword.length > 0 && (
                                <p
                                    className={`text-sm px-1 ${
                                        password === confirmPassword ? 'text-green-600' : 'text-red-600'
                                    }`}
                                >
                                    {password === confirmPassword ? '一致しています。' : '一致しません。'}
                                </p>
                            )}
                        </div>

                        {/* Success Message */}
                        {message && (
                            <div className="rounded-[10px] bg-green-50 border border-green-200 p-3">
                                <p className="text-sm text-green-600 text-center">{message}</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-[10px] bg-red-50 border border-red-200 p-3">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={
                                loading ||
                                !!message ||
                                !password ||
                                !confirmPassword ||
                                password !== confirmPassword
                            }
                            className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '更新中...' : 'パスワードを更新'}
                        </button>
                    </form>

                    {/* Footer Links */}
                    {message && (
                        <div className="w-full max-w-[384px] text-center text-sm text-[var(--color-text-secondary)]">
                            <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                                ログインページへ
                            </Link>
                        </div>
                    )}
                    {!message && (
                        <div className="w-full max-w-[384px] text-center text-sm text-[var(--color-text-secondary)]">
                            <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                                ログインページに戻る
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
