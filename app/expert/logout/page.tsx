'use client'

import { useEffect } from 'react'
import { signOut } from '@/lib/auth'
import { useProfileStore } from '@/store/useProfileStore'

const LOGOUT_MAX_WAIT_MS = 5000

export default function ExpertLogoutPage() {
  useEffect(() => {
    let cancelled = false
    const redirect = () => {
      if (cancelled) return
      useProfileStore.getState().setLoading(false)
      useProfileStore.getState().setIsLoggedIn(false)
      useProfileStore.getState().setProfile(null)
      window.location.href = '/login'
    }
    const timeoutId = setTimeout(redirect, LOGOUT_MAX_WAIT_MS)
    const performLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        if (cancelled) return
        signOut().catch(() => {})
      } catch (e) {
        console.error('Logout error:', e)
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId)
          redirect()
        }
      }
    }
    performLogout()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#155DFC] mx-auto mb-4"></div>
        <p className="text-gray-600">ログアウト中...</p>
      </div>
    </div>
  )
}
