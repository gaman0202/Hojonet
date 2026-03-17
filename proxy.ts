import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // userType は profiles テーブルを優先（user_metadata は登録時の値のままの場合がある）
  let userType = session?.user?.user_metadata?.userType || 'customer'
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .maybeSingle()
    userType = profile?.user_type ?? userType
  }

  // 公開ページ（ログイン不要）
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/update-password',
    '/api',
    '/_next',
    '/favicon.ico',
    '/icons',
    '/images',
    '/welcome',
    '/hearing',
    '/subsidies',
    '/supa',
    '/test',
    '/register/line',
    '/terms',
    '/privacy',
  ]

  // 公開ページかどうかチェック
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || pathname === '/'

  // 未ログインユーザーが保護されたページにアクセス
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // ログイン済みユーザーがログインページにアクセス
  if (session && (pathname === '/login' || pathname.startsWith('/register'))) {
    let redirectPath = '/dashboard'

    if (userType === 'admin') {
      redirectPath = '/admin/management'
    } else if (userType === 'expert' || userType === 'assistant') {
      redirectPath = '/expert/dashboard'
    }

    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // ログイン済みユーザーのロールベースアクセス制御
  if (session) {
    // 管理者専用ページ
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/logout')) {
      if (userType !== 'admin') {
        const redirectPath = userType === 'expert' || userType === 'assistant'
          ? '/expert/dashboard'
          : '/dashboard'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }

    // 専門家専用ページ
    if (pathname.startsWith('/expert') && !pathname.startsWith('/expert/logout')) {
      if (userType !== 'expert' && userType !== 'assistant' && userType !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 顧客専用ページ（/dashboard）
    if (pathname.startsWith('/dashboard')) {
      if (userType === 'admin') {
        return NextResponse.redirect(new URL('/admin/management', request.url))
      }
      if (userType === 'expert' || userType === 'assistant') {
        return NextResponse.redirect(new URL('/expert/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

