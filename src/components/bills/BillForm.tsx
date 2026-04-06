import { useState, type FormEvent } from 'react'
import { clsx } from 'clsx'
import type { Bill, Category } from '../../types/database'
import { RECURRENCE_LABELS, PIX_KEY_LABELS } from '../../lib/formatters'

interface BillFormProps {
  initial?: Partial<Bill>
  categories: Category[]
  onSubmit: (data: Omit<Bill, 'id' | 'created_at' | 'financial_profile_id'>) => Promise<void>
  onCancel: () => void
}

const inputClass = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm'
const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'

export function BillForm({ initial, categories, onSubmit, onCancel }: BillFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<Bill['type']>(initial?.type ?? 'expense')
  const [recurrence, setRecurrence] = useState<Bill['recurrence']>(initial?.recurrence ?? 'monthly')
  const [expectedAmount, setExpectedAmount] = useState(String(initial?.expected_amount ?? ''))
  const [dueDay, setDueDay] = useState(String(initial?.due_day ?? ''))
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [payeeName, setPayeeName] = useState(initial?.payee_name ?? '')
  const [pixKey, setPixKey] = useState(initial?.pix_key ?? '')
  const [pixKeyType, setPixKeyType] = useState<Bill['pix_key_type']>(initial?.pix_key_type ?? null)
  const [autoDebit, setAutoDebit] = useState(initial?.auto_debit ?? false)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit({
        name,
        type,
        recurrence,
        expected_amount: parseFloat(expectedAmount) || 0,
        due_day: dueDay ? parseInt(dueDay) : null,
        category_id: categoryId || null,
        payee_name: payeeName || null,
        pix_key: pixKey || null,
        pix_key_type: pixKey ? pixKeyType : null,
        auto_debit: autoDebit,
        is_active: isActive,
        notes: notes || null,
      })
    } catch {
      setError('Erro ao salvar conta. Tente novamente.')
      setLoading(false)
    }
  }

  const revenueCategories = categories.filter(c => c.is_revenue)
  const expenseCategories = categories.filter(c => !c.is_revenue)
  const filteredCategories = type === 'revenue' ? revenueCategories : expenseCategories

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tipo */}
      <div>
        <label className={labelClass}>Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'revenue'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={clsx(
                'py-2 rounded-lg text-sm font-medium border transition-colors',
                type === t
                  ? t === 'expense'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              )}
            >
              {t === 'expense' ? '↑ Despesa' : '↓ Receita'}
            </button>
          ))}
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className={labelClass}>Nome da conta *</label>
        <input
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ex: Conta de Luz - CPFL"
          className={inputClass}
        />
      </div>

      {/* Valor e Vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Valor esperado (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={expectedAmount}
            onChange={e => setExpectedAmount(e.target.value)}
            placeholder="0,00"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Dia de vencimento</label>
          <input
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={e => setDueDay(e.target.value)}
            placeholder="ex: 10"
            className={inputClass}
          />
        </div>
      </div>

      {/* Recorrência */}
      <div>
        <label className={labelClass}>Recorrência</label>
        <select
          value={recurrence}
          onChange={e => setRecurrence(e.target.value as Bill['recurrence'])}
          className={inputClass}
        >
          {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Categoria */}
      <div>
        <label className={labelClass}>Categoria</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
          ))}
        </select>
      </div>

      {/* Beneficiário */}
      <div>
        <label className={labelClass}>Beneficiário / Empresa</label>
        <input
          type="text"
          value={payeeName}
          onChange={e => setPayeeName(e.target.value)}
          placeholder="ex: CPFL Energia"
          className={inputClass}
        />
      </div>

      {/* PIX */}
      <div>
        <label className={labelClass}>Chave PIX</label>
        <div className="space-y-2">
          <select
            value={pixKeyType ?? ''}
            onChange={e => setPixKeyType((e.target.value as Bill['pix_key_type']) || null)}
            className={inputClass}
          >
            <option value="">Tipo de chave</option>
            {Object.entries(PIX_KEY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            type="text"
            value={pixKey}
            onChange={e => setPixKey(e.target.value)}
            placeholder="Chave PIX"
            className={inputClass}
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoDebit}
            onChange={e => setAutoDebit(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          <div>
            <span className="text-sm text-slate-300">Débito automático</span>
            <p className="text-xs text-slate-500">Não aparece na sessão de pagamento</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-300">Conta ativa</span>
        </label>
      </div>

      {/* Observações */}
      <div>
        <label className={labelClass}>Observações</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anotações adicionais..."
          rows={2}
          className={clsx(inputClass, 'resize-none')}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
