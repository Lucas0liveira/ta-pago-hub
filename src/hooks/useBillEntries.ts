import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { BillEntry } from '../types/database'

export function useBillEntries(year: number) {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['bill_entries', activeFinancialProfileId, year],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      // First fetch bill IDs for this profile
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('financial_profile_id', activeFinancialProfileId!)

      if (billsError) throw billsError
      if (!bills || bills.length === 0) return [] as BillEntry[]

      const { data, error } = await supabase
        .from('bill_entries')
        .select('*')
        .eq('year', year)
        .in('bill_id', bills.map(b => b.id))

      if (error) throw error
      return data as BillEntry[]
    },
  })
}

export function useUpsertBillEntry() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (entry: Pick<BillEntry, 'bill_id' | 'month' | 'year' | 'actual_amount' | 'status' | 'notes'>) => {
      const { data, error } = await supabase
        .from('bill_entries')
        .upsert(entry, { onConflict: 'bill_id,month,year' })
        .select()
        .single()

      if (error) throw error
      return data as BillEntry
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bill_entries', activeFinancialProfileId, data.year] })
    },
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  const { activeFinancialProfileId, user } = useAuth()

  return useMutation({
    mutationFn: async ({ entryId, paid }: { entryId: string; paid: boolean }) => {
      const { data, error } = await supabase
        .from('bill_entries')
        .update({
          status: paid ? 'paid' : 'pending',
          paid_at: paid ? new Date().toISOString() : null,
          paid_by: paid ? user?.id : null,
        })
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error
      return data as BillEntry
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bill_entries', activeFinancialProfileId, data.year] })
    },
  })
}
