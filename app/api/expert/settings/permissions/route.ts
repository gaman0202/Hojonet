import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/** GET: 権限設定を取得 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    // expert_profiles から権限設定を取得（行がなくてもエラーにしない）
    const { data: expertProfile } = await supabaseAdmin
      .from('expert_profiles')
      .select('assistant_permissions')
      .eq('user_id', user.id)
      .maybeSingle();

    const permissions = expertProfile?.assistant_permissions || {
      canCreateEditCases: false,
      canViewCustomerInfo: false,
      canApproveDocuments: false,
    };

    return NextResponse.json(permissions);
  } catch (e) {
    console.error('GET permissions error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PATCH: 権限設定を更新 */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const body = await request.json();
    const { canCreateEditCases, canViewCustomerInfo, canApproveDocuments } = body;

    const permissions = {
      canCreateEditCases: canCreateEditCases ?? false,
      canViewCustomerInfo: canViewCustomerInfo ?? false,
      canApproveDocuments: canApproveDocuments ?? false,
    };

    // expert_profiles に権限設定を保存
    const { data: existingProfile } = await supabaseAdmin
      .from('expert_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingProfile) {
      // 既存のレコードを更新
      const { error: updateError } = await supabaseAdmin
        .from('expert_profiles')
        .update({ assistant_permissions: permissions })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update permissions error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // 新規レコードを作成
      const { error: insertError } = await supabaseAdmin
        .from('expert_profiles')
        .insert({
          user_id: user.id,
          assistant_permissions: permissions,
        });

      if (insertError) {
        console.error('Insert permissions error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, permissions });
  } catch (e) {
    console.error('PATCH permissions error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
