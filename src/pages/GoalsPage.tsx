import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Target, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { Modal } from '../components/ui/Modal'
import { formatCurrency, formatDate } from '../lib/formatters'
import type { Goal } from '../types/database'

const GOAL_ICONS = ['🎯', '🏠', '✈️', '🚗', '📱', '💻', '🎓', '👶', '🏖️', '💰', '🏋️', '🌍']
const GOAL_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [modalOpen, setModalOpen] = useState(false)
  const [depositModal, setDepositModal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function openCreate() { setEditingGoal(null); setModalOpen(true) }
  function openEdit(g: Goal) { setEditingGoal(g); setModalOpen(true) }

  const totalTargets = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Metas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Objetivos financeiros</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova meta
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-xs text-slate-500 mb-1 truncate">Metas ativas</p>
            <p className="text-2xl font-bold text-white">{goals.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-xs text-slate-500 mb-1 truncate">Economizado</p>
            <p className="text-sm sm:text-xl font-bold text-emerald-400 truncate">{formatCurrency(totalSaved)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-xs text-slate-500 mb-1 truncate">Necessário</p>
            <p className="text-sm sm:text-xl font-bold text-white truncate">{formatCurrency(totalTargets)}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">Nenhuma meta cadastrada ainda.</p>
          <p className="text-slate-500 text-sm mb-4">Crie metas de economia e acompanhe seu progresso.</p>
          <button onClick={openCreate} className="text-emerald-400 hover:text-emerald-300 text-sm">
            Criar primeira meta →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0
            const remaining = goal.target_amount - goal.current_amount
            const isComplete = pct >= 100

            return (
              <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                {/* Goal header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${goal.color ?? '#10b981'}20` }}
                    >
                      {goal.icon ?? '🎯'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{goal.name}</h3>
                      {goal.target_date && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <CalendarDays className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{formatDate(goal.target_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(goal)}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(goal.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{pct.toFixed(0)}% concluído</span>
                    <span className={clsx('font-medium', isComplete ? 'text-emerald-400' : 'text-white')}>
                      {formatCurrency(goal.current_amount)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: goal.color ?? '#10b981' }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-slate-500">
                    Meta: {formatCurrency(goal.target_amount)}
                  </span>
                  {!isComplete && (
                    <span className="text-xs text-slate-500">
                      Faltam: {formatCurrency(remaining)}
                    </span>
                  )}
                  {isComplete && (
                    <span className="text-xs text-emerald-400 font-medium">Meta atingida! 🎉</span>
                  )}
                </div>

                {/* Deposit button */}
                {!isComplete && (
                  <button
                    onClick={() => setDepositModal(goal)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-xs transition-colors"
                  >
                    + Adicionar valor
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Editar meta' : 'Nova meta'}
        size="md"
      >
        <GoalForm
          initial={editingGoal ?? undefined}
          onSubmit={async (data) => {
            if (editingGoal) {
              await updateGoal.mutateAsync({ id: editingGoal.id, ...data })
            } else {
              await createGoal.mutateAsync(data)
            }
            setModalOpen(false)
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Deposit modal */}
      <Modal
        open={!!depositModal}
        onClose={() => setDepositModal(null)}
        title="Adicionar valor à meta"
        size="sm"
      >
        {depositModal && (
          <DepositForm
            goal={depositModal}
            onSubmit={async (amount) => {
              await updateGoal.mutateAsync({
                id: depositModal.id,
                current_amount: depositModal.current_amount + amount,
              })
              setDepositModal(null)
            }}
            onCancel={() => setDepositModal(null)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir meta"
        size="sm"
      >
        <div className="p-6">
          <p className="text-slate-300 text-sm mb-5">Tem certeza que deseja excluir esta meta?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await deleteGoal.mutateAsync(deleteConfirm!); setDeleteConfirm(null) }}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GoalForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Goal>
  onSubmit: (data: Omit<Goal, 'id' | 'created_at' | 'financial_profile_id'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(String(initial?.target_amount ?? ''))
  const [currentAmount, setCurrentAmount] = useState(String(initial?.current_amount ?? '0'))
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '🎯')
  const [color, setColor] = useState(initial?.color ?? '#10b981')
  const [loading, setLoading] = useState(false)

  const inputClass = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      name,
      target_amount: parseFloat(targetAmount) || 0,
      current_amount: parseFloat(currentAmount) || 0,
      target_date: targetDate || null,
      icon,
      color,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Icon picker */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Ícone</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map(i => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={clsx(
                'w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors',
                icon === i ? 'bg-slate-700 ring-2 ring-emerald-500' : 'bg-slate-800 hover:bg-slate-700'
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Cor</label>
        <div className="flex gap-2">
          {GOAL_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={clsx(
                'w-7 h-7 rounded-full transition-transform',
                color === c && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="ex: Viagem ao Japão" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor alvo (R$) *</label>
          <input type="number" required min="0" step="0.01" value={targetAmount}
            onChange={e => setTargetAmount(e.target.value)} placeholder="0,00" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Já economizado (R$)</label>
          <input type="number" min="0" step="0.01" value={currentAmount}
            onChange={e => setCurrentAmount(e.target.value)} placeholder="0,00" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Data limite (opcional)</label>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={inputClass} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function DepositForm({ goal, onSubmit, onCancel }: {
  goal: Goal
  onSubmit: (amount: number) => Promise<void>
  onCancel: () => void
}) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(parseFloat(amount) || 0)
    setLoading(false)
  }

  const newTotal = goal.current_amount + (parseFloat(amount) || 0)
  const pct = goal.target_amount > 0 ? Math.min((newTotal / goal.target_amount) * 100, 100) : 0

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{goal.icon ?? '🎯'}</span>
        <div>
          <p className="text-white font-medium text-sm">{goal.name}</p>
          <p className="text-xs text-slate-500">
            {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor a adicionar (R$)</label>
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          autoFocus
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0,00"
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

      {amount && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Novo progresso</span>
            <span className="text-white font-medium">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color ?? '#10b981' }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{formatCurrency(newTotal)} / {formatCurrency(goal.target_amount)}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
          {loading ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
