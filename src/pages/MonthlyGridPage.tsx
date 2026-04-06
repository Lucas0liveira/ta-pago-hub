import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useBills } from '../hooks/useBills'
import { useBillEntries, useUpsertBillEntry } from '../hooks/useBillEntries'
import { CellEditPopover } from '../components/ui/CellEditPopover'
import { formatCurrency, MONTH_NAMES } from '../lib/formatters'
import type { BillEntry } from '../types/database'

const STATUS_CELL: Record<BillEntry['status'], string> = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  paid: 'text-emerald-400 bg-emerald-500/10 line-through',
  overdue: 'text-red-400 bg-red-500/10',
  skipped: 'text-slate-500 bg-slate-800',
}

export default function MonthlyGridPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [openCell, setOpenCell] = useState<{ billId: string; month: number } | null>(null)

  const { data: bills = [], isLoading: billsLoading } = useBills()
  const { data: entries = [], isLoading: entriesLoading } = useBillEntries(year)
  const upsertEntry = useUpsertBillEntry()

  const activeBills = bills.filter(b => b.is_active)
  const expenses = activeBills.filter(b => b.type === 'expense')
  const revenues = activeBills.filter(b => b.type === 'revenue')

  // Build a lookup map: bill_id -> month -> entry
  const entryMap = new Map<string, Map<number, BillEntry>>()
  for (const e of entries) {
    if (!entryMap.has(e.bill_id)) entryMap.set(e.bill_id, new Map())
    entryMap.get(e.bill_id)!.set(e.month, e)
  }

  function getEntry(billId: string, month: number) {
    return entryMap.get(billId)?.get(month)
  }

  async function handleSave(billId: string, month: number, data: { actual_amount: number; status: BillEntry['status']; notes: string }) {
    await upsertEntry.mutateAsync({ bill_id: billId, month, year, ...data })
    setOpenCell(null)
  }

  function monthTotals(type: 'expense' | 'revenue') {
    const billList = type === 'expense' ? expenses : revenues
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      return billList.reduce((sum, b) => {
        const e = getEntry(b.id, month)
        return sum + (e?.actual_amount ?? 0)
      }, 0)
    })
  }

  const expenseTotals = monthTotals('expense')
  const revenueTotals = monthTotals('revenue')
  const netTotals = revenueTotals.map((r, i) => r - expenseTotals[i])

  const isLoading = billsLoading || entriesLoading
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Grade Mensal</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visão anual — clique em uma célula para editar</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold w-14 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeBills.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          Nenhuma conta ativa. Cadastre contas primeiro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-slate-400 font-medium w-44 sticky left-0 bg-slate-950 z-10">
                  Conta
                </th>
                {MONTH_NAMES.map((m, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'py-2 px-2 text-center text-xs font-medium w-20',
                      i + 1 === currentMonth && year === currentYear
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    )}
                  >
                    {m.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Revenues section */}
              {revenues.length > 0 && (
                <>
                  <SectionHeader label="Receitas" colSpan={13} />
                  {revenues.map(bill => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      year={year}
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      getEntry={getEntry}
                      openCell={openCell}
                      setOpenCell={setOpenCell}
                      onSave={handleSave}
                    />
                  ))}
                  <TotalsRow label="Total receitas" totals={revenueTotals} variant="revenue" />
                </>
              )}

              {/* Expenses section */}
              {expenses.length > 0 && (
                <>
                  <SectionHeader label="Despesas" colSpan={13} />
                  {expenses.map(bill => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      year={year}
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      getEntry={getEntry}
                      openCell={openCell}
                      setOpenCell={setOpenCell}
                      onSave={handleSave}
                    />
                  ))}
                  <TotalsRow label="Total despesas" totals={expenseTotals} variant="expense" />
                </>
              )}

              {/* Net row */}
              <TotalsRow label="Saldo líquido" totals={netTotals} variant="net" />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-800 sticky left-0 bg-slate-950"
      >
        {label}
      </td>
    </tr>
  )
}

function TotalsRow({ label, totals, variant }: {
  label: string
  totals: number[]
  variant: 'revenue' | 'expense' | 'net'
}) {
  const textColor = variant === 'revenue'
    ? 'text-emerald-400'
    : variant === 'expense'
    ? 'text-red-400'
    : 'text-white'

  return (
    <tr className="border-t border-slate-800">
      <td className={clsx('py-2 px-3 font-semibold text-xs sticky left-0 bg-slate-900 z-10', textColor)}>
        {label}
      </td>
      {totals.map((total, i) => (
        <td key={i} className={clsx('py-2 px-2 text-center text-xs font-semibold bg-slate-900', textColor)}>
          {total !== 0 ? formatCurrency(total) : '—'}
        </td>
      ))}
    </tr>
  )
}

interface BillRowProps {
  bill: { id: string; name: string; expected_amount: number; type: string }
  year: number
  currentMonth: number
  currentYear: number
  getEntry: (billId: string, month: number) => BillEntry | undefined
  openCell: { billId: string; month: number } | null
  setOpenCell: (v: { billId: string; month: number } | null) => void
  onSave: (billId: string, month: number, data: { actual_amount: number; status: BillEntry['status']; notes: string }) => Promise<void>
}

function BillRow({ bill, year, currentMonth, currentYear, getEntry, openCell, setOpenCell, onSave }: BillRowProps) {
  return (
    <tr className="group hover:bg-slate-900/50 transition-colors">
      <td className="py-2 px-3 sticky left-0 bg-slate-950 group-hover:bg-slate-900/50 z-10">
        <span className="text-slate-200 text-xs font-medium truncate max-w-[160px] block">{bill.name}</span>
      </td>

      {Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        const entry = getEntry(bill.id, month)
        const isOpen = openCell?.billId === bill.id && openCell.month === month
        const isCurrent = month === currentMonth && year === currentYear
        const amount = entry?.actual_amount ?? bill.expected_amount
        const status = entry?.status ?? 'pending'

        return (
          <td key={month} className="py-1 px-1 relative">
            <button
              onClick={() => setOpenCell(isOpen ? null : { billId: bill.id, month })}
              className={clsx(
                'w-full py-1.5 px-1 rounded-lg text-xs text-center transition-colors font-medium',
                STATUS_CELL[status],
                isCurrent && 'ring-1 ring-emerald-500/40',
                'hover:brightness-110'
              )}
            >
              {amount > 0 ? formatCurrency(amount) : '—'}
            </button>

            {isOpen && (
              <CellEditPopover
                entry={entry}
                billName={bill.name}
                month={month}
                onSave={(data) => onSave(bill.id, month, data)}
                onClose={() => setOpenCell(null)}
              />
            )}
          </td>
        )
      })}
    </tr>
  )
}
