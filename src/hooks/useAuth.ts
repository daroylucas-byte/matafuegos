import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, UserRol } from '../types'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (userId: string) => {
      if (fetchingRef.current) return
      fetchingRef.current = true
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (mounted) setProfile(data)
      } finally {
        fetchingRef.current = false
        if (mounted) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        window.location.href = '/login'
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    profile,
    rol: profile?.rol as UserRol | undefined,
    loading,
    signOut
  }
}
