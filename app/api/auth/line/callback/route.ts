import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { randomBytes } from 'crypto';

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

/** LINE code を access_token に交換 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  channelId: string,
  channelSecret: string
): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE token error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data;
}

/** LINE アクセストークンでプロフィール取得 */
async function getLineProfile(accessToken: string): Promise<{
  userId: string;
  displayName?: string;
  pictureUrl?: string;
}> {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE profile error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    userId: string;
    displayName?: string;
    pictureUrl?: string;
  };
  return data;
}

export async function GET(request: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return NextResponse.redirect(new URL('/login?error=line_config', request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const stateCookie = request.cookies.get('line_oauth_state')?.value;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const xfHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.split(',')[0]?.trim();
  const originFromForwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : null;
  const originFromHost = host ? `${request.nextUrl.protocol}//${host}` : null;
  const origin = appUrl || originFromForwarded || originFromHost || request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/line/callback`;
  const redirectToSupabase = `${origin}/auth/callback`;
  console.log('[LINE callback] origin=', origin, 'redirect_uri=', redirectUri, 'redirectTo(Supabase)=', redirectToSupabase, 'NEXT_PUBLIC_APP_URL=', appUrl ?? '(empty)');

  if (searchParams.get('debug') === '1') {
    return NextResponse.json({
      origin,
      redirect_uri: redirectUri,
      redirectToSupabase,
      NEXT_PUBLIC_APP_URL: appUrl ?? null,
      from: appUrl ? 'NEXT_PUBLIC_APP_URL' : originFromForwarded ? 'x-forwarded-*' : originFromHost ? 'host' : 'nextUrl.origin',
    });
  }

  if (!code || !state || state !== stateCookie) {
    return NextResponse.redirect(new URL('/login?error=line_invalid', request.url));
  }

  let accessToken: string;
  let profile: { userId: string; displayName?: string; pictureUrl?: string };

  try {
    const tokenData = await exchangeCodeForToken(
      code,
      redirectUri,
      channelId,
      channelSecret
    );
    accessToken = tokenData.access_token;
    profile = await getLineProfile(accessToken);
  } catch (e) {
    console.error('LINE OAuth error:', e);
    return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
  }

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('line_id', profile.userId)
    .maybeSingle();

  let userId: string;
  let email: string;

  if (existingProfile) {
    userId = existingProfile.id;
    email = existingProfile.email ?? `line_${profile.userId}@line.hojonet.local`;
  } else {
    email = `line_${profile.userId}@line.hojonet.local`;
    const password = randomBytes(32).toString('hex');

    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          userType: 'customer',
          name: profile.displayName ?? null,
          lineId: profile.userId,
        },
      });

    if (createError) {
      if (
        createError.message.includes('already registered') ||
        /already been registered/i.test(createError.message)
      ) {
        const { data: byEmail } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (byEmail) {
          userId = byEmail.id;
          await supabaseAdmin
            .from('profiles')
            .update({
              line_id: profile.userId,
              full_name: profile.displayName ?? undefined,
              icon_url: profile.pictureUrl ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } else {
          return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
        }
      } else {
        console.error('LINE createUser error:', createError);
        return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
      }
    } else if (createData?.user) {
      userId = createData.user.id;
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        email: createData.user.email ?? email,
        full_name: profile.displayName ?? null,
        company_name: null,
        phone: '',
        business_type: '',
        location: '',
        industry: '',
        employees: '',
        user_type: 'customer',
        group_id: userId,
        line_id: profile.userId,
        icon_url: profile.pictureUrl ?? null,
      });

      if (profileError) {
        console.error('LINE profile insert error:', profileError);
        return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
      }
    } else {
      return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
    }
  }

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectToSupabase,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('LINE generateLink error:', linkError);
    return NextResponse.redirect(new URL('/login?error=line_failed', request.url));
  }

  const res = NextResponse.redirect(linkData.properties.action_link);
  res.cookies.delete('line_oauth_state');
  return res;
}
