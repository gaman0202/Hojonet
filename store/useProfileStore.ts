'use client';

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

interface Profile {
    id?: string;
    email?: string;
    full_name?: string;
    company_name?: string;
    phone?: string;
    business_type?: string;
    location?: string;
    industry?: string;
    employees?: string;
    user_type?: string;
    group_id?: string;
    line_id?: string | null;
    representative_name?: string | null;
    contact_name?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface ProfileState {
    profile: Profile | null;
    isLoggedIn: boolean;
    loading: boolean;
    setProfile: (profile: Profile | null) => void;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    setLoading: (loading: boolean) => void;
    fetchProfile: () => Promise<void>;
    initialize: () => Promise<{ unsubscribe: () => void } | undefined>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    profile: null,
    isLoggedIn: false,
    loading: true,

    setProfile: (profile) => set({ profile }),
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    setLoading: (loading) => set({ loading }),

    fetchProfile: async () => {
        try {
            // サーバーサイドAPIでセッションを確認（ブラウザクライアントのcookie読み取り問題を回避）
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            const data = await res.json();

            if (data.authenticated) {
                set({ isLoggedIn: true, profile: data.profile || null });
            } else {
                set({ isLoggedIn: false, profile: null });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            set({ profile: null, isLoggedIn: false });
        } finally {
            set({ loading: false });
        }
    },

    initialize: async () => {
        const supabase = createClient();
        await get().fetchProfile();

        // onAuthStateChange でログイン/ログアウト時にプロフィールを再取得
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event) => {
            await get().fetchProfile();
        });

        return subscription;
    },
}));
