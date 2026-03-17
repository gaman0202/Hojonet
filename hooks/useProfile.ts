'use client';

import { useEffect, useRef } from 'react';
import { useProfileStore } from '@/store/useProfileStore';

// グローバルな初期化状態（全インスタンスで共有）
let globalInitializing = false;
let globalInitialized = false;

export function useProfile() {
    const { profile, isLoggedIn, loading, initialize, setLoading, fetchProfile } = useProfileStore();
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
    const retryRef = useRef(false);

    useEffect(() => {
        // すでに初期化済み or 初期化中なら何もしない
        if (globalInitialized || globalInitializing) {
            return;
        }

        let isMounted = true;
        globalInitializing = true;

        const setup = async () => {
            try {
                const subscription = await initialize();
                if (isMounted && subscription) {
                    subscriptionRef.current = subscription;
                }
            } catch (error) {
                console.error('Error initializing profile:', error);
                // 初期化が失敗しても loading を false にする
                setLoading(false);
            } finally {
                globalInitializing = false;
                globalInitialized = true;
            }
        };

        // 10秒のタイムアウト（万が一 initialize が終わらない場合のフォールバック）
        const fallbackTimeout = setTimeout(() => {
            if (useProfileStore.getState().loading) {
                console.warn('Profile initialization timed out, forcing loading=false');
                setLoading(false);
                globalInitializing = false;
                globalInitialized = true;
            }
        }, 10000);

        setup().finally(() => clearTimeout(fallbackTimeout));

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimeout);
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ログイン直後など、認証済みなのにプロフィールが空のとき1回だけ再取得（Cookie 反映遅延対策）
    useEffect(() => {
        if (loading || !isLoggedIn || profile != null || retryRef.current) return;
        retryRef.current = true;
        const t = setTimeout(() => {
            fetchProfile();
        }, 300);
        return () => clearTimeout(t);
    }, [loading, isLoggedIn, profile, fetchProfile]);

    return {
        profile,
        isLoggedIn,
        loading,
        userName: profile?.full_name ?? '',
        companyName: profile?.company_name ?? '',
    };
}
