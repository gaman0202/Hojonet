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

/** GET: 専門家プロフィール情報を取得 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, furigana, user_type, group_id, icon_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    if (!isExpertRole) {
      return NextResponse.json({ error: '専門家アカウントではありません。' }, { status: 403 });
    }

    const { data: expertProfile, error: expertError } = await supabaseAdmin
      .from('expert_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const specialties = expertProfile?.specialties 
      ? (Array.isArray(expertProfile.specialties) ? expertProfile.specialties : [])
      : [];

    return NextResponse.json({
      profile: {
        name: profile.full_name || '',
        furigana: profile.furigana || '',
        email: profile.email || '',
        phone: profile.phone || '',
        iconUrl: profile.icon_url || '',
        message: expertProfile?.one_line_message || '',
        officeName: expertProfile?.office_name || '',
        officeLocation: expertProfile?.office_address || '',
        registrationNumber: expertProfile?.registration_number || '',
        affiliation: expertProfile?.association || '',
        registrationYear: expertProfile?.registration_year ? `${expertProfile.registration_year}年` : '',
        region: '', // TODO: region 필드가 없으면 빈 문자열
        businessHours: expertProfile?.business_hours || {
          monday: { start: '09:00', end: '18:00', isClosed: false },
          tuesday: { start: '09:00', end: '18:00', isClosed: false },
          wednesday: { start: '09:00', end: '18:00', isClosed: false },
          thursday: { start: '09:00', end: '18:00', isClosed: false },
          friday: { start: '09:00', end: '18:00', isClosed: false },
          saturday: { start: '', end: '', isClosed: true },
          sunday: { start: '', end: '', isClosed: true },
        },
        expertise: specialties.map((s: string, idx: number) => ({ id: String(idx + 1), name: s })),
      },
    });
  } catch (e) {
    console.error('GET expert profile error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PATCH: 専門家プロフィール情報を更新 */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
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
    const {
      name,
      furigana,
      email,
      phone,
      iconUrl,
      message,
      officeName,
      officeLocation,
      registrationNumber,
      affiliation,
      registrationYear,
      businessHours,
      expertise,
    } = body;

    // profiles 테이블 업데이트（phone 等 NOT NULL のため null は空文字に）
    const profileUpdate: Record<string, unknown> = {};
    if (name !== undefined) profileUpdate.full_name = name;
    if (furigana !== undefined) profileUpdate.furigana = furigana;
    if (email !== undefined) profileUpdate.email = email;
    if (phone !== undefined) profileUpdate.phone = phone == null || phone === '' ? '' : String(phone).trim();
    if (iconUrl !== undefined) profileUpdate.icon_url = iconUrl || null;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);
      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
        return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
      }
    }

    // expert_profiles 테이블 업데이트 (upsert)
    const registrationYearNum = registrationYear 
      ? parseInt(registrationYear.replace(/[^0-9]/g, ''), 10) || null 
      : null;
    const specialties = expertise && Array.isArray(expertise) 
      ? expertise.map((e: { name?: string }) => e.name).filter(Boolean)
      : null;

    const expertProfileUpdate: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (message !== undefined) expertProfileUpdate.one_line_message = message || null;
    if (officeName !== undefined) expertProfileUpdate.office_name = officeName || null;
    if (officeLocation !== undefined) expertProfileUpdate.office_address = officeLocation || null;
    if (registrationNumber !== undefined) expertProfileUpdate.registration_number = registrationNumber || null;
    if (affiliation !== undefined) expertProfileUpdate.association = affiliation || null;
    if (registrationYearNum !== undefined) expertProfileUpdate.registration_year = registrationYearNum;
    if (specialties !== null) expertProfileUpdate.specialties = specialties;
    // business_hours は expert_profiles にカラムがある場合のみ別 update（カラム未追加時は schema cache エラーを避ける）
    // マイグレーション add_expert_profiles_business_hours.sql 適用後は保存される

    const { error: expertUpdateError } = await supabaseAdmin
      .from('expert_profiles')
      .upsert(expertProfileUpdate, { onConflict: 'user_id' });

    if (expertUpdateError) {
      console.error('Expert profile update error:', expertUpdateError);
      return NextResponse.json({ error: expertUpdateError.message }, { status: 500 });
    }

    if (businessHours !== undefined) {
      const { error: bhError } = await supabaseAdmin
        .from('expert_profiles')
        .update({ business_hours: businessHours, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (bhError) {
        // カラムが無い場合などは無視（保存は成功扱い）
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH expert profile error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
