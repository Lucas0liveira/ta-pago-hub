import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { AuthContext } from '../../stores/authStore'
import type { Profile, Household, FinancialProfile } from '../../types/database'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [financialProfiles, setFinancialProfiles] = useState<FinancialProfile[]>([])
  const [activeFinancialProfileId, setActiveFinancialProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async (userId: string) => {
    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', userId)
        .single(),
    ])

    if (profileRes.data) setProfile(profileRes.data)

    if (memberRes.data) {
      const hh = (memberRes.data as any).households as Household
      setHousehold(hh)

      const fpRes = await supabase
        .from('financial_profiles')
        .select('*')
        .eq('household_id', hh.id)
        .order('created_at')

      if (fpRes.data && fpRes.data.length > 0) {
        setFinancialProfiles(fpRes.data)
        setActiveFinancialProfileId((prev) => prev ?? fpRes.data[0].id)
      }
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserData(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setProfile(null)
        setHousehold(null)
        setFinancialProfiles([])
        setActiveFinancialProfileId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserData])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      household,
      financialProfiles,
      activeFinancialProfileId,
      loading,
      setActiveFinancialProfile: setActiveFinancialProfileId,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
