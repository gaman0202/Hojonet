import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * サーバー側でセッション（クッキー）を削除する。
 * クライアントの signOut だけではサーバーが設定したクッキーが残ることがあるため、
 * ログアウト時はこの API を呼んでから /login へリダイレクトする。
 */
export async function POST() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as { path?: string });
            });
          },
        },
      }
    );

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return NextResponse.json({ ok: true }); // エラーでもクライアントは /login へ進める
  }
}
