import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'

export function useInsightsData(year: number) {
  const { activeFinancialProfileId } = useAuth()

  return useQuery({
    queryKey: ['insights', activeFinancialProfileId, year],
    enabled: !!activeFinancialProfileId,
    queryFn: async () => {
      // Bills for this profile
      const { data: bills } = await supabase
        .from('bills')
        .select('id, name, type, expected_amount, is_active, category_id, recurrence')
        .eq('financial_profile_id', activeFinancialProfileId!)
        .eq('is_active', true)

      if (!bills || bills.length === 0) return emptyInsights()

      const billIds = bills.map(b => b.id)

      // All entries for the selected year
      const { data: yearEntries } = await supabase
        .from('bill_entries')
        .select('bill_id, month, actual_amount, status')
        .eq('year', year)
        .in('bill_id', billIds)

      // All entries for previous year (for YoY comparison)
      const { data: prevYearEntries } = await supabase
        .from('bill_entries')
        .select('bill_id, month, actual_amount')
        .eq('year', year - 1)
        .in('bill_id', billIds)

      // Categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, color, is_revenue')
        .eq('financial_profile_id', activeFinancialProfileId!)

      const catMap = new Map((categories ?? []).map(c => [c.id, c]))

      const entries = yearEntries ?? []
      const prevEntries = prevYearEntries ?? []

      // ── Monthly revenue / expense / net ──────────────────────────────────────
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const mEntries = entries.filter(e => e.month === m)
        const entryByBill = new Map(mEntries.map(e => [e.bill_id, e]))
        const prevMEntries = prevEntries.filter(e => e.month === m)
        const prevEntryByBill = new Map(prevMEntries.map(e => [e.bill_id, e]))

        let rev = 0, exp = 0, prevRev = 0, prevExp = 0
        for (const bill of bills) {
          const amt = entryByBill.get(bill.id)?.actual_amount ?? 0
          const prevAmt = prevEntryByBill.get(bill.id)?.actual_amount ?? 0
          if (bill.type === 'revenue') { rev += amt; prevRev += prevAmt }
          else { exp += amt; prevExp += prevAmt }
        }
        return { month: m, receitas: rev, despesas: exp, saldo: rev - exp, prevReceitas: prevRev, prevDespesas: prevExp }
      })

      // ── Annual totals ─────────────────────────────────────────────────────────
      const totalRevenue = monthlyData.reduce((s, d) => s + d.receitas, 0)
      const totalExpenses = monthlyData.reduce((s, d) => s + d.despesas, 0)
      const totalNet = totalRevenue - totalExpenses
      const prevRevenue = monthlyData.reduce((s, d) => s + d.prevReceitas, 0)
      const prevExpenses = monthlyData.reduce((s, d) => s + d.prevDespesas, 0)

      // ── Active months count (months with any entry) ───────────────────────────
      const activeMonths = monthlyData.filter(d => d.receitas > 0 || d.despesas > 0).length || 1
      const avgMonthlyRevenue = totalRevenue / activeMonths
      const avgMonthlyExpenses = totalExpenses / activeMonths

      // ── Profit margin per month (revenue > 0 only) ────────────────────────────
      const marginData = monthlyData.map(d => ({
        month: d.month,
        margin: d.receitas > 0 ? ((d.receitas - d.despesas) / d.receitas) * 100 : null,
        receitas: d.receitas,
        despesas: d.despesas,
      }))

      // ── Category breakdown across full year ───────────────────────────────────
      const expCatTotals = new Map<string, number>()
      const revCatTotals = new Map<string, number>()
      for (const bill of bills) {
        const billTotal = entries
          .filter(e => e.bill_id === bill.id)
          .reduce((s, e) => s + e.actual_amount, 0)
        if (billTotal === 0) continue
        const key = bill.category_id ?? '__sem_categoria'
        if (bill.type === 'expense') expCatTotals.set(key, (expCatTotals.get(key) ?? 0) + billTotal)
        else revCatTotals.set(key, (revCatTotals.get(key) ?? 0) + billTotal)
      }
      const expenseCategoryBreakdown = Array.from(expCatTotals.entries())
        .map(([catId, amount]) => {
          const cat = catMap.get(catId)
          return { name: cat?.name ?? 'Sem categoria', amount, color: cat?.color ?? '#64748b' }
        })
        .sort((a, b) => b.amount - a.amount)
      const revenueCategoryBreakdown = Array.from(revCatTotals.entries())
        .map(([catId, amount]) => {
          const cat = catMap.get(catId)
          return { name: cat?.name ?? 'Sem categoria', amount, color: cat?.color ?? '#64748b' }
        })
        .sort((a, b) => b.amount - a.amount)

      // ── Stacked category expenses per month (top 5 categories) ───────────────
      const topExpCats = expenseCategoryBreakdown.slice(0, 5).map(c => c.name)
      const stackedExpenses = monthlyData.map(d => {
        const mEntries = entries.filter(e => e.month === d.month)
        const entryByBill = new Map(mEntries.map(e => [e.bill_id, e]))
        const row: Record<string, number> = { month: d.month }
        for (const catName of topExpCats) row[catName] = 0
        row['Outros'] = 0

        for (const bill of bills.filter(b => b.type === 'expense')) {
          const amt = entryByBill.get(bill.id)?.actual_amount ?? 0
          if (amt === 0) continue
          const cat = catMap.get(bill.category_id ?? '')
          const catName = cat?.name ?? 'Sem categoria'
          if (topExpCats.includes(catName)) row[catName] = (row[catName] ?? 0) + amt
          else row['Outros'] = (row['Outros'] ?? 0) + amt
        }
        return row
      })

      // ── Top bills by total spend ──────────────────────────────────────────────
      const billTotals = bills.map(b => ({
        name: b.name,
        type: b.type,
        recurrence: b.recurrence,
        total: entries.filter(e => e.bill_id === b.id).reduce((s, e) => s + e.actual_amount, 0),
      })).filter(b => b.total > 0).sort((a, b) => b.total - a.total)

      const topExpenseBills = billTotals.filter(b => b.type === 'expense').slice(0, 8)
      const topRevenueBills = billTotals.filter(b => b.type === 'revenue').slice(0, 5)

      // ── Month-over-month deltas ───────────────────────────────────────────────
      const momData = monthlyData.map((d, i) => {
        const prev = i > 0 ? monthlyData[i - 1] : null
        return {
          month: d.month,
          expDelta: prev && prev.despesas > 0 ? ((d.despesas - prev.despesas) / prev.despesas) * 100 : null,
          revDelta: prev && prev.receitas > 0 ? ((d.receitas - prev.receitas) / prev.receitas) * 100 : null,
        }
      })

      // ── Recurring vs one-time expense split ──────────────────────────────────
      let recurringTotal = 0, oneTimeTotal = 0
      for (const bill of bills.filter(b => b.type === 'expense')) {
        const t = entries.filter(e => e.bill_id === bill.id).reduce((s, e) => s + e.actual_amount, 0)
        if (bill.recurrence === 'one_time') oneTimeTotal += t
        else recurringTotal += t
      }

      return {
        monthlyData,
        marginData,
        stackedExpenses,
        topExpCats,
        expenseCategoryBreakdown,
        revenueCategoryBreakdown,
        topExpenseBills,
        topRevenueBills,
        momData,
        summary: {
          totalRevenue,
          totalExpenses,
          totalNet,
          prevRevenue,
          prevExpenses,
          avgMonthlyRevenue,
          avgMonthlyExpenses,
          profitMargin: totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : null,
          recurringTotal,
          oneTimeTotal,
        },
      }
    },
  })
}

function emptyInsights() {
  return {
    monthlyData: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, receitas: 0, despesas: 0, saldo: 0, prevReceitas: 0, prevDespesas: 0,
    })),
    marginData: [] as { month: number; margin: number | null; receitas: number; despesas: number }[],
    stackedExpenses: [] as Record<string, number>[],
    topExpCats: [] as string[],
    expenseCategoryBreakdown: [] as { name: string; amount: number; color: string }[],
    revenueCategoryBreakdown: [] as { name: string; amount: number; color: string }[],
    topExpenseBills: [] as { name: string; type: string; recurrence: string; total: number }[],
    topRevenueBills: [] as { name: string; type: string; recurrence: string; total: number }[],
    momData: [] as { month: number; expDelta: number | null; revDelta: number | null }[],
    summary: {
      totalRevenue: 0, totalExpenses: 0, totalNet: 0,
      prevRevenue: 0, prevExpenses: 0,
      avgMonthlyRevenue: 0, avgMonthlyExpenses: 0,
      profitMargin: null as number | null,
      recurringTotal: 0, oneTimeTotal: 0,
    },
  }
}
