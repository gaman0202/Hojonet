'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type UserType = 'admin' | 'expert' | 'assistant' | 'customer' | 'member' | 'introducer'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles: UserType[]
  fallbackPath?: string
}

export default function AuthGuard({ 
  children, 
  allowedRoles, 
  fallbackPath 
}: AuthGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = res.ok ? await res.json() : null

        if (cancelled) return

        if (!data?.authenticated) {
          window.location.href = '/login'
          return
        }

        const userType = (data.userType ?? data.profile?.user_type ?? 'customer') as UserType

        if (allowedRoles.includes(userType)) {
          setIsAuthorized(true)
        } else {
          const redirectPath = fallbackPath || getDefaultDashboard(userType)
          window.location.href = redirectPath
        }
      } catch {
        if (!cancelled) window.location.href = '/login'
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router, allowedRoles, fallbackPath])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#155DFC] mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

function getDefaultDashboard(userType: UserType): string {
  switch (userType) {
    case 'admin':
      return '/admin/management'
    case 'expert':
    case 'assistant':
      return '/expert/dashboard'
    case 'customer':
    case 'member':
    case 'introducer':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

// HOC版
export function withAuthGuard(
  WrappedComponent: React.ComponentType<Record<string, unknown>>,
  allowedRoles: UserType[],
  fallbackPath?: string
) {
  return function WithAuthGuardComponent(props: Record<string, unknown>) {
    return (
      <AuthGuard allowedRoles={allowedRoles} fallbackPath={fallbackPath}>
        <WrappedComponent {...props} />
      </AuthGuard>
    )
  }
}
