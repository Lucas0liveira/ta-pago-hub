import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X, CheckCircle2, Save } from 'lucide-react'
import { clsx } from 'clsx'
import { useBankTransactions, useSaveReconciliation } from '../hooks/useBankImports'
import { useBankImports } from '../hooks/useBankImports'
import { useBills, useCategories, useCreateBill } from '../hooks/useBills'
import { formatCurrency, formatDate } from '../lib/formatters'
import type { Bill } from '../types/database'

// ─── Quick-create bill modal ──────────────────────────────────────────────────
function QuickBillModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (bill: Bill) => void
}) {
  const { data: categories = [] } = useCategories()
  const createBill = useCreateBill()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    try {
      const bill = await createBill.mutateAsync({
        name: name.trim(),
        type: 'expense',
        recurrence: 'monthly',
        expected_amount: 0,
        category_id: categoryId || null,
        due_day: null,
        pix_key: null,
        pix_key_type: null,
        payee_name: null,
        notes: null,
        is_active: true,
        auto_debit: false,
      })
      onCreated(bill as Bill)
    } catch {
      setError('Erro ao criar conta.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base">Nova conta</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Nome da conta</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: [F] Fornecedor XYZ"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Categoria (opcional)</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sem categoria</option>
              {categories.filter(c => !c.is_revenue).map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createBill.isPending}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createBill.isPending ? 'Criando...' : 'Criar e vincular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type MatchMap = Map<string, string> // txId → billId

export default function ReconciliationPage() {
  const { importId } = useParams<{ importId: string }>()
  const navigate = useNavigate()

  const { data: imports = [] } = useBankImports()
  const { data: transactions = [], isLoading } = useBankTransactions(importId ?? null)
  const { data: bills = [] } = useBills()
  const saveReconciliation = useSaveReconciliation()

  // Local match state: txId → billId
  const [matches, setMatches] = useState<MatchMap>(() => {
    const m: MatchMap = new Map()
    return m
  })

  // Initialise matches from already-reconciled transactions (run once when data loads)
  const [initialised, setInitialised] = useState(false)
  if (!initialised && transactions.length > 0) {
    const m: MatchMap = new Map()
    for (const tx of transactions) {
      if (tx.is_reconciled && tx.matched_bill_entry_id) {
        // We need billId; we'll resolve it later via bills list
        // Store matched_bill_entry_id as a special sentinel and resolve after
        m.set(tx.id, `entry:${tx.matched_bill_entry_id}`)
      }
    }
    setMatches(m)
    setInitialised(true)
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pendingGroupDesc, setPendingGroupDesc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const importRecord = imports.find(i => i.id === importId)

  // Only debits need reconciliation
  const debits = useMemo(() => transactions.filter(t => t.type === 'debit'), [transactions])
  const credits = useMemo(() => transactions.filter(t => t.type === 'credit'), [transactions])

  // Group debits by description
  const groups = useMemo(() => {
    const map = new Map<string, typeof debits>()
    for (const tx of debits) {
      const key = tx.description
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return Array.from(map.entries()).map(([desc, txs]) => ({
      desc,
      txs,
      total: txs.reduce((s, t) => s + t.amount, 0),
    })).sort((a, b) => b.total - a.total) // largest spend first
  }, [debits])

  // Resolve matched billId for a group (all txs in a group have the same description, so same bill)
  function getBillIdForGroup(desc: string): string {
    const tx = debits.find(t => t.description === desc)
    if (!tx) return ''
    const val = matches.get(tx.id) ?? ''
    if (val.startsWith('entry:')) return '' // not yet resolved to a billId
    return val
  }

  function setGroupBill(desc: string, billId: string) {
    setMatches(prev => {
      const next = new Map(prev)
      for (const tx of debits.filter(t => t.description === desc)) {
        if (billId) next.set(tx.id, billId)
        else next.delete(tx.id)
      }
      return next
    })
    setSavedOk(false)
  }

  // Summary: per bill totals
  const billTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const [txId, billId] of matches) {
      if (!billId || billId.startsWith('entry:')) continue
      const tx = debits.find(t => t.id === txId)
      if (!tx) continue
      map.set(billId, (map.get(billId) ?? 0) + tx.amount)
    }
    return map
  }, [matches, debits])

  const reconciledGroups = groups.filter(g => !!getBillIdForGroup(g.desc))
  const progress = groups.length > 0 ? (reconciledGroups.length / groups.length) * 100 : 0

  async function handleSave() {
    if (!importId) return
    setSaving(true)
    try {
      // Build the map the hook expects
      const matchData = new Map<string, { billId: string; billEntryId: string | null; amount: number; month: number; year: number }>()
      for (const [txId, billId] of matches) {
        if (!billId || billId.startsWith('entry:')) continue
        const tx = debits.find(t => t.id === txId)
        if (!tx) continue
        const date = new Date(tx.date)
        matchData.set(txId, {
          billId,
          billEntryId: null, // hook will upsert and create if needed
          amount: tx.amount,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        })
      }
      await saveReconciliation.mutateAsync({ importId, matches: matchData })
      setSavedOk(true)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const expenseBills = (bills ?? []).filter(b => b.type === 'expense')

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/importar')} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {importRecord?.file_name ?? 'Conciliação'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {importRecord ? formatDate(importRecord.imported_at) : ''}
            {' · '}{groups.length} descrições únicas · {debits.length} débitos
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>{reconciledGroups.length}/{groups.length} descrições vinculadas</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Credits summary */}
      {credits.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-green-500/5 border border-green-500/20 rounded-xl mb-4 text-sm">
          <span className="text-slate-400">{credits.length} entrada{credits.length > 1 ? 's' : ''} (créditos)</span>
          <span className="text-green-400 font-semibold">
            +{formatCurrency(credits.reduce((s, t) => s + t.amount, 0))}
          </span>
        </div>
      )}

      {/* Bill totals summary (only when something is matched) */}
      {billTotals.size > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-sm font-semibold text-white">Resumo por conta</p>
            <p className="text-xs text-slate-500 mt-0.5">Soma das transações vinculadas</p>
          </div>
          <div className="divide-y divide-slate-800/50">
            {Array.from(billTotals.entries()).map(([billId, total]) => {
              const bill = bills?.find(b => b.id === billId)
              return (
                <div key={billId} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-slate-300">{bill?.name ?? '—'}</span>
                  <span className="text-sm font-semibold text-red-400">-{formatCurrency(total)}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40">
              <span className="text-sm font-semibold text-white">Total conciliado</span>
              <span className="text-sm font-bold text-red-400">
                -{formatCurrency(Array.from(billTotals.values()).reduce((s, v) => s + v, 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Description groups */}
      <div className="space-y-2">
        {groups.map(({ desc, txs, total }) => {
          const billId = getBillIdForGroup(desc)
          const linkedBill = billId ? bills?.find(b => b.id === billId) : null

          return (
            <div
              key={desc}
              className={clsx(
                'bg-slate-900 border rounded-xl overflow-hidden transition-colors',
                billId ? 'border-emerald-500/20' : 'border-slate-800'
              )}
            >
              {/* Group header */}
              <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium break-words">{desc}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {txs.length} transaç{txs.length === 1 ? 'ão' : 'ões'}
                    {txs.length > 1 && (
                      <span className="ml-1.5">
                        ({formatDate(txs[0].date)} – {formatDate(txs[txs.length - 1].date)})
                      </span>
                    )}
                    {txs.length === 1 && <span className="ml-1.5">· {formatDate(txs[0].date)}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-400">-{formatCurrency(total)}</p>
                  {txs.length > 1 && (
                    <p className="text-xs text-slate-600 mt-0.5">{formatCurrency(total / txs.length)}/un</p>
                  )}
                </div>
              </div>

              {/* Bill selector */}
              <div className="px-4 pb-3 flex items-center gap-2">
                {linkedBill ? (
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-sm text-emerald-400 font-medium flex-1 truncate">{linkedBill.name}</span>
                    <button
                      onClick={() => setGroupBill(desc, '')}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setPendingGroupDesc(desc)
                        setShowCreateModal(true)
                      } else {
                        setGroupBill(desc, e.target.value)
                      }
                    }}
                    className="flex-1 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Vincular à conta...</option>
                    <option value="__new__">+ Criar nova conta</option>
                    {expenseBills.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating save bar */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 px-4 pb-4 pt-3 bg-slate-950/90 backdrop-blur border-t border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {savedOk && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Salvo
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || billTotals.size === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : `Salvar conciliação · ${reconciledGroups.length}/${groups.length}`}
          </button>
        </div>
      </div>

      {/* Quick create modal */}
      {showCreateModal && (
        <QuickBillModal
          onClose={() => { setShowCreateModal(false); setPendingGroupDesc(null) }}
          onCreated={(bill) => {
            if (pendingGroupDesc) setGroupBill(pendingGroupDesc, bill.id)
            setShowCreateModal(false)
            setPendingGroupDesc(null)
          }}
        />
      )}
    </div>
  )
}
