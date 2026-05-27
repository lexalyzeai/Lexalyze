// src/app/components/AuthRecovery.tsx
'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthRecovery() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') return
      if (event === 'USER_UPDATED') return
      
      // Clear stale tokens on any auth error
      supabase.auth.getSession().catch(() => {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k))
        window.location.href = '/auth/login'
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}