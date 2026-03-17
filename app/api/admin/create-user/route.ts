import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createUser } from '@/lib/admin/users';

/*
curl -X POST http://localhost:3000/api/admin/create-user \
-H "Content-Type: application/json" \
-d '{"name": "管理者2", "email": "admin907@gmail.com", "phone": "08020318733", "industry": "製造業", "location": "東京都", "userType": "admin", "employees": "1〜5名", "companyName": "テックスタートadmin2", "businessType": "株式会社", "password": "password", "key": "Proto@Password"}'

curl -X POST http://localhost:3000/api/admin/create-user \
-H "Content-Type: application/json" \
-d '{"name": "専門家", "email": "expert907@gmail.com", "phone": "08020318733", "industry": "製造業", "location": "東京都", "userType": "expert", "employees": "1〜5名", "companyName": "テックスタートexpert1", "businessType": "株式会社", "password": "password", "key": "Proto@Password"}'
*/

export async function POST(request: NextRequest) {
  try {
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      console.error('ADMIN_API_KEY environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'サーバー設定エラーです。' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.key || body.key !== adminApiKey) {
      return NextResponse.json(
        { success: false, error: 'APIキーが無効またはありません。' },
        { status: 401 }
      );
    }

    const user = await createUser(supabaseAdmin, {
      email: body.email,
      password: body.password,
      name: body.name,
      companyName: body.companyName,
      phone: body.phone,
      businessType: body.businessType,
      location: body.location,
      industry: body.industry,
      employees: body.employees,
      userType: body.userType,
      groupId: body.groupId,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          created_at: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';

    if (
      message === 'Email and password are required' ||
      message === 'Invalid email format' ||
      message === 'Password must be at least 8 characters long' ||
      message === 'groupId is required for member/assistant'
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    if (message === 'USER_ALREADY_EXISTS') {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスのユーザーは既に存在します。' },
        { status: 409 }
      );
    }

    console.error('create-user API error:', e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
