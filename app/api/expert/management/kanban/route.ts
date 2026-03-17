import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { getExpertKanbanData } from '@/lib/expert/cases';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * GET: 専門家カンバン用の案件一覧＋申請者名を取得（RLSを避けるためサーバーで profiles 取得）
 * Query: subsidyId (補助金ID)
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subsidyIdParam = searchParams.get('subsidyId');
    const subsidyId = subsidyIdParam ? parseInt(subsidyIdParam, 10) : NaN;
    if (Number.isNaN(subsidyId)) {
      return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    const expertGroupId = profile?.group_id ?? user.id;
    const result = await getExpertKanbanData(supabaseAdmin, {
      subsidyId,
      expertGroupId: String(expertGroupId),
    });

    return NextResponse.json({
      subsidyTitle: result.subsidyTitle,
      kanbanColumns: result.kanbanColumns,
      ...(result.error && { error: result.error }),
    });
  } catch (e) {
    console.error('Kanban API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
