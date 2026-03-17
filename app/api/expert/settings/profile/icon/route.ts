import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// プロフィール写真は公開表示のため専用バケット（public=true）を使用
const BUCKET = 'profile-icons';

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

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

/** POST: 専門家プロフィール写真をアップロード */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, icon_url')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    if (!['expert', 'assistant', 'admin'].includes(profile.user_type ?? '')) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'ファイルを選択してください。' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: '画像ファイル（jpg, png, gif, webp）を選択してください。' }, { status: 400 });
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以内にしてください。' }, { status: 400 });
    }

    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type || (ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/gif'),
        upsert: false,
      });

    if (uploadError) {
      console.error('Profile icon upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(uploadData.path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ icon_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile icon_url update error:', updateError);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ iconUrl: publicUrl });
  } catch (e) {
    console.error('Profile icon upload error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
