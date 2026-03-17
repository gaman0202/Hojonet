import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const SCOPE = 'profile openid';

export async function GET(request: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return NextResponse.json(
      { error: 'LINE Login is not configured.' },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const xfHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.split(',')[0]?.trim();
  const originFromForwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : null;
  const originFromHost = host ? `${request.nextUrl.protocol}//${host}` : null;
  const origin = appUrl || originFromForwarded || originFromHost || request.nextUrl.origin;

  const redirectUri = `${origin}/api/auth/line/callback`;
  console.log('[LINE auth] origin=', origin, 'redirect_uri=', redirectUri, 'NEXT_PUBLIC_APP_URL=', appUrl ?? '(empty)');

  if (request.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({
      origin,
      redirect_uri: redirectUri,
      NEXT_PUBLIC_APP_URL: appUrl ?? null,
      from: appUrl ? 'NEXT_PUBLIC_APP_URL' : originFromForwarded ? 'x-forwarded-*' : originFromHost ? 'host' : 'nextUrl.origin',
    });
  }

  const state = randomBytes(24).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPE,
  });

  const url = `${LINE_AUTH_URL}?${params.toString()}`;
  const res = NextResponse.redirect(url);

  res.cookies.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return res;
}
