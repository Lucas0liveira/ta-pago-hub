import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { useBills, useCategories, useCreateBill, useUpdateBill, useDeleteBill, type BillWithCategory } from '../hooks/useBills'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { BillForm } from '../components/bills/BillForm'
import { PixCopyButton } from '../components/bills/PixCopyButton'
import { formatCurrency, RECURRENCE_LABELS } from '../lib/formatters'
import type { Bill, Category } from '../types/database'

type FilterType = 'all' | 'expense' | 'revenue'

export default function BillsPage() {
  const { data: bills = [], isLoading } = useBills()
  const { data: categories = [] } = useCategories()
  const createBill = useCreateBill()
  const updateBill = useUpdateBill()
  const deleteBill = useDeleteBill()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = bills.filter(b => {
    if (!showInactive && !b.is_active) return false
    if (filterType !== 'all' && b.type !== filterType) return false
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const expenses = filtered.filter(b => b.type === 'expense')
  const revenues = filtered.filter(b => b.type === 'revenue')

  function openCreate() {
    setEditingBill(null)
    setModalOpen(true)
  }

  function openEdit(bill: Bill) {
    setEditingBill(bill)
    setModalOpen(true)
  }

  async function handleSubmit(data: Omit<Bill, 'id' | 'created_at' | 'financial_profile_id'>) {
    if (editingBill) {
      await updateBill.mutateAsync({ id: editingBill.id, ...data })
    } else {
      await createBill.mutateAsync(data)
    }
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteBill.mutateAsync(id)
    setDeleteConfirm(null)
  }

  async function toggleActive(bill: Bill) {
    await updateBill.mutateAsync({ id: bill.id, is_active: !bill.is_active })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Contas</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {bills.filter(b => b.is_active).length} contas ativas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova conta
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conta..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        {/* Type filter */}
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {([['all', 'Todas'], ['expense', 'Despesas'], ['revenue', 'Receitas']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterType(v)}
              className={clsx(
                'px-3 py-2 text-sm transition-colors',
                filterType === v
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Show inactive */}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
            showInactive
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'border-slate-700 text-slate-400 hover:text-white'
          )}
        >
          {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          Inativas
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Nenhuma conta encontrada.</p>
          <button onClick={openCreate} className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm">
            Criar primeira conta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Despesas */}
          {(filterType === 'all' || filterType === 'expense') && expenses.length > 0 && (
            <BillSection
              title="Despesas"
              bills={expenses}
              categories={categories}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onToggleActive={toggleActive}
            />
          )}

          {/* Receitas */}
          {(filterType === 'all' || filterType === 'revenue') && revenues.length > 0 && (
            <BillSection
              title="Receitas"
              bills={revenues}
              categories={categories}
              onEdit={openEdit}
              onDelete={id => setDeleteConfirm(id)}
              onToggleActive={toggleActive}
            />
          )}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBill ? 'Editar conta' : 'Nova conta'}
        size="md"
      >
        <BillForm
          initial={editingBill ?? undefined}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir conta"
        size="sm"
      >
        <div className="p-6">
          <p className="text-slate-300 text-sm mb-5">
            Tem certeza? Isso irá excluir a conta e todos os lançamentos mensais associados.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm!)}
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

interface BillSectionProps {
  title: string
  bills: BillWithCategory[]
  categories: Category[]
  onEdit: (bill: Bill) => void
  onDelete: (id: string) => void
  onToggleActive: (bill: Bill) => void
}

function BillSection({ title, bills, onEdit, onDelete, onToggleActive }: BillSectionProps) {
  const isRevenue = title === 'Receitas'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-500">{bills?.length}</span>
      </div>

      <div className="space-y-2">
        {bills?.map(bill => (
          <div
            key={bill.id}
            className={clsx(
              'flex items-center gap-4 p-4 bg-slate-900 border rounded-xl transition-colors',
              bill.is_active ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
            )}
          >
            {/* Color indicator */}
            <div className={clsx(
              'w-1 self-stretch rounded-full shrink-0',
              isRevenue ? 'bg-emerald-500' : 'bg-red-500'
            )} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white text-sm">{bill.name}</span>
                {bill.auto_debit && (
                  <span title="Débito automático">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  </span>
                )}
                {!bill.is_active && <Badge variant="slate">Inativa</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-slate-500">
                  {RECURRENCE_LABELS[bill.recurrence]}
                  {bill.due_day ? ` · dia ${bill.due_day}` : ''}
                </span>
                {bill.payee_name && (
                  <span className="text-xs text-slate-500">{bill.payee_name}</span>
                )}
                {bill.pix_key && (
                  <PixCopyButton pixKey={bill.pix_key} pixKeyType={bill.pix_key_type} />
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              <span className={clsx(
                'font-semibold text-sm',
                isRevenue ? 'text-emerald-400' : 'text-white'
              )}>
                {formatCurrency(bill.expected_amount)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggleActive(bill)}
                title={bill.is_active ? 'Desativar' : 'Ativar'}
                className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                {bill.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit(bill)}
                className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(bill.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
