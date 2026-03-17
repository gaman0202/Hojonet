'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Supabase magic link リダイレクト先。
 * URL の hash に access_token / refresh_token が付与されているので setSession して /dashboard へ遷移する。
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const run = async () => {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        if (!cancelled) {
          setError('認証情報がありません。再度ログインをお試しください。');
          setProcessing(false);
        }
        return;
      }

      try {
        const { data, error: err } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (err) {
          setError('セッションの設定に失敗しました。');
          setProcessing(false);
          return;
        }

        if (data.session) {
          // クッキー反映後に API でプロフィール取得してリダイレクト先を決定
          await new Promise((r) => setTimeout(r, 300));
          const meRes = await fetch('/api/auth/me');
          const meData = meRes.ok ? await meRes.json() : {};
          const userType = meData.userType ?? meData.profile?.user_type ?? 'customer';
          const targetPath =
            userType === 'admin' ? '/admin/management' :
            userType === 'expert' || userType === 'assistant' ? '/expert/dashboard' :
            '/dashboard';
          router.replace(targetPath);
        } else {
          setError('セッションの設定に失敗しました。');
          setProcessing(false);
        }
      } catch {
        if (!cancelled) {
          setError('エラーが発生しました。');
          setProcessing(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error && !processing) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <a href="/login" className="mt-4 inline-block text-[var(--color-primary)] hover:underline">
            ログインへ戻る
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-[var(--color-text-secondary)]">ログイン処理中...</p>
    </main>
  );
}
