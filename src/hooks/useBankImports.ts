import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { BankImport, BankTransaction } from '../types/database'

export function useBankImports() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['bank_imports', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_imports')
        .select('*')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .order('imported_at', { ascending: false })
      if (error) throw error
      return data as BankImport[]
    },
  })
}

export function useBankTransactions(importId: string | null) {
  return useQuery({
    queryKey: ['bank_transactions', importId],
    enabled: !!importId,
    queryFn: async () => {
      // PostgREST default max-rows can truncate large imports.
      // Use range() to explicitly page through all rows.
      const PAGE = 1000
      let all: BankTransaction[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('bank_transactions')
          .select('*')
          .eq('import_id', importId!)
          .order('date', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) throw error
        all = all.concat(data as BankTransaction[])
        if (!data || data.length < PAGE) break
        from += PAGE
      }
      return all
    },
  })
}

export function useImportTransactions() {
  const qc = useQueryClient()
  const { activeFinancialProfileId, user } = useAuth()

  return useMutation({
    mutationFn: async ({
      fileName,
      transactions,
    }: {
      fileName: string
      transactions: Omit<BankTransaction, 'id' | 'import_id' | 'matched_bill_entry_id' | 'category_id' | 'is_reconciled'>[]
    }) => {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('bank_imports')
        .insert({
          financial_profile_id: activeFinancialProfileId!,
          imported_by: user!.id,
          file_name: fileName,
          row_count: transactions.length,
        })
        .select()
        .single()

      if (importError) throw importError

      // Insert transactions in batches of 100
      const rows = transactions.map(t => ({ ...t, import_id: importRecord.id }))
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('bank_transactions').insert(rows.slice(i, i + 100))
        if (error) throw error
      }

      return importRecord as BankImport
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_imports', activeFinancialProfileId] }),
  })
}

export function useDeleteImport() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (importId: string) => {
      // Cascade: delete transactions first, then the import record
      const { error: txError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('import_id', importId)
      if (txError) throw txError

      const { error } = await supabase
        .from('bank_imports')
        .delete()
        .eq('id', importId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_imports', activeFinancialProfileId] }),
  })
}

export function useMatchTransaction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ transactionId, billEntryId, importId, description }: {
      transactionId: string
      billEntryId: string | null
      importId: string
      description: string
    }) => {
      // Link the chosen transaction
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          matched_bill_entry_id: billEntryId,
          is_reconciled: billEntryId !== null,
        })
        .eq('id', transactionId)
      if (error) throw error

      // Auto-link all other unreconciled transactions in the same import
      // with the exact same description
      if (billEntryId && description) {
        await supabase
          .from('bank_transactions')
          .update({ matched_bill_entry_id: billEntryId, is_reconciled: true })
          .eq('import_id', importId)
          .eq('description', description)
          .eq('is_reconciled', false)
          .neq('id', transactionId)
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['bank_transactions', vars.importId] })
    },
  })
}
