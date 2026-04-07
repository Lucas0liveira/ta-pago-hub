import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'

export function useDashboardData(month: number, year: number) {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['dashboard', activeFinancialProfileId, month, year],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      // Bills for this profile
      const { data: bills } = await supabase
        .from('bills')
        .select('id, name, type, expected_amount, is_active, category_id')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .eq('is_active', true)

      if (!bills || bills.length === 0) return emptyDashboard()

      const billIds = bills.map(b => b.id)

      // Current month entries
      const { data: currentEntries } = await supabase
        .from('bill_entries')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .in('bill_id', billIds)

      // All entries for the year (for the 12-month chart)
      const { data: yearEntries } = await supabase
        .from('bill_entries')
        .select('bill_id, month, actual_amount, status')
        .eq('year', year)
        .in('bill_id', billIds)

      // Categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, color, is_revenue')
        .eq('financial_profile_id', activeFinancialProfileId!)

      const catMap = new Map((categories ?? []).map(c => [c.id, c]))

      // --- Current month summary ---
      // Use actual_amount only — 0 when no entry, not expected_amount,
      // so this stays consistent with the monthly grid totals.
      const entryMap = new Map((currentEntries ?? []).map(e => [e.bill_id, e]))

      let totalRevenue = 0
      let totalExpenses = 0
      let paidCount = 0
      let pendingCount = 0

      for (const bill of bills) {
        const entry = entryMap.get(bill.id)
        const amount = entry?.actual_amount ?? 0
        if (bill.type === 'revenue') totalRevenue += amount
        else totalExpenses += amount
        if (entry?.status === 'paid') paidCount++
        else pendingCount++
      }

      // --- 12-month chart data ---
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const mEntries = (yearEntries ?? []).filter(e => e.month === m)
        const entryByBill = new Map(mEntries.map(e => [e.bill_id, e]))

        let rev = 0, exp = 0
        for (const bill of bills) {
          const entry = entryByBill.get(bill.id)
          const amount = entry?.actual_amount ?? 0
          if (bill.type === 'revenue') rev += amount
          else exp += amount
        }
        return { month: m, receitas: rev, despesas: exp, saldo: rev - exp }
      })

      // --- Category breakdown (current month expenses) ---
      const catTotals = new Map<string, number>()
      for (const bill of bills.filter(b => b.type === 'expense')) {
        const entry = entryMap.get(bill.id)
        const amount = entry?.actual_amount ?? 0
        if (amount === 0) continue
        const key = bill.category_id ?? '__sem_categoria'
        catTotals.set(key, (catTotals.get(key) ?? 0) + amount)
      }
      const categoryBreakdown = Array.from(catTotals.entries())
        .map(([catId, amount]) => {
          const cat = catMap.get(catId)
          return { name: cat?.name ?? 'Sem categoria', amount, color: cat?.color ?? '#64748b' }
        })
        .sort((a, b) => b.amount - a.amount)

      // --- Top 5 expenses this month (only bills with actual entries) ---
      const topExpenses = bills
        .filter(b => b.type === 'expense')
        .map(b => {
          const entry = entryMap.get(b.id)
          return { name: b.name, amount: entry?.actual_amount ?? 0 }
        })
        .filter(b => b.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      return {
        totalRevenue,
        totalExpenses,
        netBalance: totalRevenue - totalExpenses,
        paidCount,
        pendingCount,
        totalBills: bills.length,
        monthlyData,
        categoryBreakdown,
        topExpenses,
      }
    },
  })
}

function emptyDashboard() {
  return {
    totalRevenue: 0,
    totalExpenses: 0,
    netBalance: 0,
    paidCount: 0,
    pendingCount: 0,
    totalBills: 0,
    monthlyData: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, receitas: 0, despesas: 0, saldo: 0,
    })),
    categoryBreakdown: [] as { name: string; amount: number; color: string }[],
    topExpenses: [] as { name: string; amount: number }[],
  }
}
