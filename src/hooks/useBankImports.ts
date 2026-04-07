import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { BankImport, BankTransaction, DescriptionMapping } from '../types/database'

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

// Save all reconciliation changes for an import:
// 1. Bulk-update matched_bill_entry_id / is_reconciled on bank_transactions
// 2. Upsert bill_entries with actual_amount = sum of matched transaction amounts (per bill, month, year)
export function useSaveReconciliation() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      matches, // map: transactionId → { billId, billEntryId, amount, month, year }
    }: {
      importId: string
      matches: Map<string, { billId: string; billEntryId: string | null; amount: number; month: number; year: number }>
    }) => {
      // 1. Collect all tx updates
      const updates = Array.from(matches.entries()).map(([txId, m]) => ({
        id: txId,
        matched_bill_entry_id: m.billEntryId,
        is_reconciled: m.billEntryId !== null,
      }))

      // Update each transaction (PostgREST doesn't support bulk update with different values per row)
      for (const u of updates) {
        const { error } = await supabase
          .from('bank_transactions')
          .update({ matched_bill_entry_id: u.matched_bill_entry_id, is_reconciled: u.is_reconciled })
          .eq('id', u.id)
        if (error) throw error
      }

      // 2. Aggregate totals: group by (billId, month, year)
      const totals = new Map<string, { billId: string; month: number; year: number; total: number }>()
      for (const [, m] of matches) {
        if (!m.billId) continue
        const key = `${m.billId}|${m.month}|${m.year}`
        const existing = totals.get(key)
        if (existing) {
          existing.total += m.amount
        } else {
          totals.set(key, { billId: m.billId, month: m.month, year: m.year, total: m.amount })
        }
      }

      // 3. Upsert bill_entries
      for (const { billId, month, year, total } of totals.values()) {
        const { error } = await supabase
          .from('bill_entries')
          .upsert(
            {
              bill_id: billId,
              month,
              year,
              actual_amount: total,
              status: 'paid',
              paid_at: new Date().toISOString(),
              paid_by: user?.id,
            },
            { onConflict: 'bill_id,month,year' }
          )
        if (error) throw error
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['bank_transactions', vars.importId] })
      qc.invalidateQueries({ queryKey: ['bill_entries'] })
    },
  })
}

// ─── Description mappings (reconciliation memory) ────────────────────────────

export function useDescriptionMappings() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['description_mappings', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('description_mappings')
        .select('*')
        .eq('financial_profile_id', activeFinancialProfileId!)
      if (error) throw error
      return data as DescriptionMapping[]
    },
  })
}

export function useSaveDescriptionMappings() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async (mappings: { description: string; bill_id: string }[]) => {
      if (!mappings.length) return
      const rows = mappings.map(m => ({
        financial_profile_id: activeFinancialProfileId!,
        description: m.description,
        bill_id: m.bill_id,
      }))
      const { error } = await supabase
        .from('description_mappings')
        .upsert(rows, { onConflict: 'financial_profile_id,description' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['description_mappings', activeFinancialProfileId] }),
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
