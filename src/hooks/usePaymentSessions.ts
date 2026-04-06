import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import type { PaymentSession, BillEntry, Bill } from '../types/database'

export interface SessionBillItem {
  entry: BillEntry
  bill: Bill
}

export function usePaymentSessions() {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['payment_sessions', activeFinancialProfileId],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .order('started_at', { ascending: false })

      if (error) throw error
      return data as PaymentSession[]
    },
  })
}

export function usePaymentSession(sessionId: string) {
  return useQuery({
    queryKey: ['payment_session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data: session, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error

      // Load pending bill entries for this month/year that aren't auto-debit
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('financial_profile_id', session.financial_profile_id)
        .eq('is_active', true)
        .eq('auto_debit', false)
        .eq('type', 'expense')

      if (!bills) return { session: session as PaymentSession, items: [] }

      const billIds = bills.map(b => b.id)

      const { data: entries } = await supabase
        .from('bill_entries')
        .select('*')
        .eq('month', session.month)
        .eq('year', session.year)
        .in('bill_id', billIds)

      // For bills without entries, synthesize a pending entry
      const entryMap = new Map((entries ?? []).map(e => [e.bill_id, e]))
      const items: SessionBillItem[] = bills.map(bill => ({
        bill,
        entry: entryMap.get(bill.id) ?? {
          id: `virtual-${bill.id}`,
          bill_id: bill.id,
          month: session.month,
          year: session.year,
          actual_amount: bill.expected_amount,
          status: 'pending' as const,
          paid_at: null,
          paid_by: null,
          payment_proof_url: null,
          notes: null,
          created_at: new Date().toISOString(),
        },
      }))

      return { session: session as PaymentSession, items }
    },
    refetchInterval: 5000, // Poll for realtime-like updates between household members
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  const { activeFinancialProfileId, user } = useAuth()

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data, error } = await supabase
        .from('payment_sessions')
        .insert({
          financial_profile_id: activeFinancialProfileId!,
          started_by: user!.id,
          month,
          year,
          status: 'in_progress',
        })
        .select()
        .single()

      if (error) throw error
      return data as PaymentSession
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_sessions', activeFinancialProfileId] })
    },
  })
}

export function useMarkSessionItemPaid() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      sessionId,
      billId,
      month,
      year,
      amount,
      paid,
    }: {
      sessionId: string
      billId: string
      month: number
      year: number
      amount: number
      paid: boolean
    }) => {
      // Upsert bill entry
      const { data: entry, error: entryError } = await supabase
        .from('bill_entries')
        .upsert(
          {
            bill_id: billId,
            month,
            year,
            actual_amount: amount,
            status: paid ? 'paid' : 'pending',
            paid_at: paid ? new Date().toISOString() : null,
            paid_by: paid ? user?.id : null,
          },
          { onConflict: 'bill_id,month,year' }
        )
        .select()
        .single()

      if (entryError) throw entryError

      // Add session item record if marking paid
      if (paid) {
        await supabase.from('payment_session_items').insert({
          session_id: sessionId,
          bill_entry_id: entry.id,
          checked_by: user?.id,
        })
      }

      return entry
    },
    onSuccess: (_data, vars) => {
      // Invalidate immediately so UI reflects the change without waiting for polling
      qc.invalidateQueries({ queryKey: ['payment_session', vars.sessionId] })
    },
    onMutate: async (vars) => {
      // Optimistic update: flip the entry status in the cache right away
      await qc.cancelQueries({ queryKey: ['payment_session', vars.sessionId] })
      const prev = qc.getQueryData<{ session: any; items: any[] }>(['payment_session', vars.sessionId])
      if (prev) {
        qc.setQueryData(['payment_session', vars.sessionId], {
          ...prev,
          items: prev.items.map(item =>
            item.bill.id === vars.billId
              ? { ...item, entry: { ...item.entry, status: vars.paid ? 'paid' : 'pending', actual_amount: vars.amount } }
              : item
          ),
        })
      }
      return { prev }
    },
    onError: (_err, vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['payment_session', vars.sessionId], ctx.prev)
    },
  })
}

export function useCompleteSession() {
  const qc = useQueryClient()
  const { activeFinancialProfileId } = useAuth()

  return useMutation({
    mutationFn: async ({ sessionId, totalPaid }: { sessionId: string; totalPaid: number }) => {
      const { error } = await supabase
        .from('payment_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString(), total_paid: totalPaid })
        .eq('id', sessionId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_sessions', activeFinancialProfileId] })
    },
  })
}
