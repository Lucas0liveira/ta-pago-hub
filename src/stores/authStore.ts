import { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, Household, FinancialProfile } from '../types/database'

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  household: Household | null
  financialProfiles: FinancialProfile[]
  activeFinancialProfileId: string | null
  loading: boolean
}

export interface AuthActions {
  setActiveFinancialProfile: (id: string) => void
  signOut: () => Promise<void>
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
