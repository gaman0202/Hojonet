'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserIcon } from '@/components/icons'

type AuthStatus = 'loading' | 'success' | 'error' | 'none'

export default function WelcomePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [authStatus, setAuthStatus] = useState<AuthStatus>('none')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        // タイムアウト設定（10秒後に強制的にローディングを解除）
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('Loading timeout - forcing loading to false');
                setLoading(false);
                if (!user) {
                    setAuthStatus('error');
                    setErrorMessage('タイムアウトが発生しました。ページを再読み込みしてください。');
                }
            }
        }, 10000);

        // URLパラメータから認証状態を判定
        const checkAuthStatus = () => {
            // クエリパラメータから
            const params = new URLSearchParams(window.location.search);
            const type = params.get('type');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            // ハッシュフラグメントから
            const hash = window.location.hash;
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token') || params.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');

            // エラーがある場合
            if (error || errorDescription) {
                setAuthStatus('error');
                setErrorMessage(errorDescription || error || 'メール認証に失敗しました');
                return;
            }

            // 成功の場合（type=signup と access_token がある）
            if (type === 'signup' && accessToken) {
                setAuthStatus('success');
            } else if (accessToken && refreshToken) {
                setAuthStatus('success');
            }
        };

        checkAuthStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            setLoading(false);
        });

        // URLからクエリパラメータとハッシュフラグメントを解析
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1));

        const accessToken = hashParams.get('access_token') || params.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');

        if (accessToken && refreshToken) {
            // トークンを使って手動でセッションを設定
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            }).then(({ data, error }) => {
                if (error) {
                    console.error('Session setup error:', error);
                    setAuthStatus('error');
                    setErrorMessage('セッションの設定に失敗しました: ' + error.message);
                } else if (data.session) {
                    setAuthStatus('success');
                }
                setLoading(false);
                // セッション設定後、URLからトークンをクリア
                router.replace('/welcome');
            }).catch((err) => {
                console.error('Unexpected error in setSession:', err);
                setAuthStatus('error');
                setErrorMessage('予期しないエラーが発生しました');
                setLoading(false);
            });
        } else {
            // トークンがない場合は、現在のセッションをチェック
            const checkUser = async () => {
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (error) {
                        console.error('getSession error:', error);
                        setAuthStatus('error');
                        setErrorMessage('セッションの取得に失敗しました');
                    } else if (session) {
                        setUser(session.user);
                        // セッションがある場合は成功とみなす
                        if (authStatus === 'none') {
                            setAuthStatus('success');
                        }
                    }
                } catch (err) {
                    console.error('Unexpected error in checkUser:', err);
                    setAuthStatus('error');
                    setErrorMessage('予期しないエラーが発生しました');
                } finally {
                    setLoading(false);
                }
            };
            checkUser();
        }

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, [router, authStatus, loading, user])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/') // ホームページにリダイレクト
    }

    if (loading) {
        return (
            <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                    <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                        <p className="text-base text-[var(--color-text-secondary)]">読み込み中...</p>
                    </div>
                </div>
            </main>
        )
    }

    if (!user) {
        return (
            <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
                <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
                    <div className="flex w-full max-w-[448px] flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
                        <div className="relative flex w-full max-w-[384px] flex-col items-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                                <UserIcon size={32} color="var(--color-primary)" />
                            </div>
                            <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">ログインが必要です</h1>
                            <p className="mt-9 text-center text-base text-[var(--color-text-secondary)]">
                                メール認証が完了していないか、<br />
                                セッションが切れています。<br />
                                ログインし直すか、<br />
                                届いた確認メールのリンクを開いてください。
                            </p>
                        </div>
                        <div className="flex flex-col w-full max-w-[384px] gap-3">
                            <Link
                                href="/login"
                                className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] flex items-center justify-center"
                            >
                                ログインへ
                            </Link>
                            <Link
                                href="/register"
                                className="h-12 w-full rounded-[10px] border border-[var(--color-border)] text-base text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)] flex items-center justify-center"
                            >
                                新規登録はこちら
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

                        <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">
                            ようこそ
                        </h1>
                        <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">
                            会員登録が完了しました
                        </p>
                    </div>

                    {/* Auth Status Message */}
                    {authStatus === 'success' && (
                        <div className="w-full max-w-[384px] rounded-[10px] bg-green-50 border border-green-200 p-4">
                            <p className="text-sm text-green-600 text-center">
                                メール認証が成功しました
                            </p>
                        </div>
                    )}

                    {authStatus === 'error' && (
                        <div className="w-full max-w-[384px] rounded-[10px] bg-red-50 border border-red-200 p-4">
                            <p className="text-sm text-red-600 text-center">
                                {errorMessage || 'メール認証に失敗しました'}
                            </p>
                        </div>
                    )}

                    {/* User Info */}
                    <div className="flex w-full max-w-[384px] flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--color-text-secondary)]">メールアドレス</label>
                            <div className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-[#F9FAFB] px-4 flex items-center text-base text-[var(--color-text-primary)]">
                                {user.email}
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Button */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="h-12 w-full max-w-[384px] rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]"
                    >
                        ダッシュボードへ
                    </button>

                    {/* Footer Link */}
                    <div className="w-full max-w-[384px] text-center text-sm text-[var(--color-text-secondary)]">
                        <Link href="/" className="text-[var(--color-primary)] hover:underline">
                            ホームに戻る
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
