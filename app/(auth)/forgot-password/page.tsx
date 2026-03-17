'use client'

import { useState } from 'react'
import { sendResetPasswordEmail } from '@/lib/auth'
import Link from 'next/link'
import { UserIcon, MailIcon } from '@/components/icons'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)
        setError(null)
        setLoading(true)

        try {
            await sendResetPasswordEmail(email)
            // Supabaseはセキュリティのため、未登録メールでも成功を返す場合があります
            setMessage('該当するアカウントが存在する場合、パスワードリセット用のメールを送信しました。メール内のリンクをクリックしてパスワードをリセットしてください。メールが届かない場合は迷惑メールフォルダをご確認ください。')
        } catch (err) {
            setError(err instanceof Error ? err.message : '送信に失敗しました。しばらくしてから再度お試しください。')
        } finally {
            setLoading(false)
        }
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

                        <h1 className="mt-4 text-center text-2xl font-semibold text-[var(--color-text-primary)]">パスワードの再設定</h1>
                        <p className="mt-3 text-center text-base text-[var(--color-text-secondary)]">メールアドレスを入力してください</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handlePasswordReset} className="flex w-full max-w-[384px] flex-col gap-5">
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
                            disabled={loading || !email.trim()}
                            className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '送信中...' : 'リセットリンクを送信'}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="flex w-full max-w-[384px] flex-col gap-2 text-center text-sm text-[var(--color-text-secondary)]">
                        <p>
                            パスワードを思い出しましたか？{' '}
                            <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                                ログイン
                            </Link>
                        </p>
                        <p>
                            アカウントをお持ちでは <br /> ありませんか？{' '}
                            <Link href="/register" className="text-[var(--color-primary)] hover:underline">
                                新規登録
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
