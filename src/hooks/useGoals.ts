import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { Goal } from '../types/database'

export function useGoals() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['goals', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Goal[]
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'created_at' | 'financial_profile_id'>) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, financial_profile_id: activeFinancialProfileId! })
        .select()
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', activeFinancialProfileId] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', activeFinancialProfileId] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', activeFinancialProfileId] }),
  })
}
