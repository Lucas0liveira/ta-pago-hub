import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { Bill, Category } from '../types/database'

export interface BillWithCategory extends Bill {
  category: Category | null
}

export function useBills() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['bills', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, category:categories(*)')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .order('name')

      if (error) throw error
      return data as BillWithCategory[]
    },
  })
}

export function useCategories() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['categories', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .order('sort_order')

      if (error) throw error
      return data as Category[]
    },
  })
}

export function useCreateBill() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (bill: Omit<Bill, 'id' | 'created_at' | 'financial_profile_id'>) => {
      const { data, error } = await supabase
        .from('bills')
        .insert({ ...bill, financial_profile_id: activeFinancialProfileId! })
        .select('*, category:categories(*)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills', activeFinancialProfileId] })
    },
  })
}

export function useUpdateBill() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bill> & { id: string }) => {
      const { data, error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills', activeFinancialProfileId] })
    },
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bills').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills', activeFinancialProfileId] })
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (cat: Omit<Category, 'id' | 'financial_profile_id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...cat, financial_profile_id: activeFinancialProfileId! })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', activeFinancialProfileId] })
    },
  })
}
