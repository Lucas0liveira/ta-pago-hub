import { useState, useRef, useEffect, type FormEvent } from 'react'
import { clsx } from 'clsx'
import type { BillEntry } from '../../types/database'
import { STATUS_LABELS } from '../../lib/formatters'

interface CellEditPopoverProps {
  entry: BillEntry | undefined
  billName: string
  month: number
  expectedAmount?: number
  onSave: (data: { actual_amount: number; status: BillEntry['status']; notes: string }) => Promise<void>
  onClose: () => void
}

export function CellEditPopover({ entry, billName, expectedAmount, onSave, onClose }: CellEditPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [amount, setAmount] = useState(String(entry?.actual_amount ?? expectedAmount ?? ''))
  const [status, setStatus] = useState<BillEntry['status']>(entry?.status ?? 'pending')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSave({ actual_amount: parseFloat(amount) || 0, status, notes })
    onClose()
  }

  const statusColors: Record<BillEntry['status'], string> = {
    pending: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    paid: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    overdue: 'text-red-400 border-red-500/30 bg-red-500/10',
    skipped: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  }

  return (
    <div
      ref={ref}
      className="absolute z-30 top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4"
    >
      <p className="text-xs font-medium text-slate-400 mb-3 truncate">{billName}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Valor (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Status</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(STATUS_LABELS) as BillEntry['status'][]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={clsx(
                  'py-1 px-2 rounded-md text-xs font-medium border transition-colors',
                  status === s ? statusColors[s] : 'text-slate-500 border-slate-700 hover:text-white'
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Observação</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="opcional..."
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
