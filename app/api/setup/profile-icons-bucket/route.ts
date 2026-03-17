import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const BUCKET_ID = 'profile-icons';

/**
 * GET: profile-icons バケットがなければ作成（public, 5MB）
 * 開発時や初回セットアップで1回だけ呼ぶ。本番ではこのルートを無効化推奨。
 */
export async function GET() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('listBuckets error:', listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const exists = buckets?.some((b) => b.name === BUCKET_ID);
    if (exists) {
      return NextResponse.json({ ok: true, message: `Bucket "${BUCKET_ID}" already exists.` });
    }

    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_ID, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });

    if (createError) {
      console.error('createBucket error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `Bucket "${BUCKET_ID}" created.` });
  } catch (e) {
    console.error('profile-icons-bucket setup error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
