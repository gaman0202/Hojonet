import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

interface ResetPasswordRequest {
  email: string;
}

// Email形式のバリデーション
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json();

    // バリデーション
    if (!body.email) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // Supabase Admin APIを使用してメールアドレスの存在を確認
    // 注意: listUsers()は全ユーザーを取得するため、ユーザー数が多い場合は
    // パフォーマンスの問題が発生する可能性があります。
    // 本番環境では、より効率的な方法（例: データベースクエリ）を検討してください。
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // メールアドレスが存在するか確認
    const userExists = users.users.some((user) => user.email?.toLowerCase() === body.email.toLowerCase());

    if (!userExists) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは登録されていません。' },
        { status: 404 }
      );
    }

    // メールアドレスが存在する場合、成功を返す
    // 実際のメール送信はクライアント側でresetPasswordForEmailを呼び出して行います
    return NextResponse.json(
      {
        success: true,
        message: 'メールアドレスが確認されました。パスワードリセットメールを送信します。',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in reset-password API:', error);
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 }
    );
  }
}
