import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { clsx } from 'clsx'
import { usePaymentSession, useMarkSessionItemPaid, useCompleteSession } from '../hooks/usePaymentSessions'
import { PixCopyButton } from '../components/bills/PixCopyButton'
import { formatCurrency, MONTH_NAMES } from '../lib/formatters'
import type { SessionBillItem } from '../hooks/usePaymentSessions'

export default function PaymentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = usePaymentSession(sessionId!)
  const markPaid = useMarkSessionItemPaid()
  const completeSession = useCompleteSession()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState(false)
  const [done, setDone] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { session, items } = data
  const paidItems = items.filter(i => i.entry.status === 'paid')
  const pendingItems = items.filter(i => i.entry.status !== 'paid')
  const totalPaid = paidItems.reduce((s, i) => s + i.entry.actual_amount, 0)
  const totalPending = pendingItems.reduce((s, i) => s + (i.entry.actual_amount || i.bill.expected_amount), 0)
  const progress = items.length > 0 ? (paidItems.length / items.length) * 100 : 0

  async function handleToggle(item: SessionBillItem) {
    const isPaid = item.entry.status === 'paid'
    const amount = amounts[item.bill.id]
      ? parseFloat(amounts[item.bill.id])
      : item.entry.actual_amount || item.bill.expected_amount

    await markPaid.mutateAsync({
      sessionId: session.id,
      billId: item.bill.id,
      month: session.month,
      year: session.year,
      amount,
      paid: !isPaid,
    })
  }

  async function handleComplete() {
    setCompleting(true)
    await completeSession.mutateAsync({ sessionId: session.id, totalPaid })
    setDone(true)
    setCompleting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sessão concluída!</h1>
        <p className="text-slate-400 mb-1">
          {MONTH_NAMES[session.month - 1]} {session.year}
        </p>
        <p className="text-3xl font-bold text-emerald-400 mt-4 mb-8">
          {formatCurrency(totalPaid)}
        </p>
        <p className="text-slate-400 text-sm mb-8">
          {paidItems.length} de {items.length} contas pagas
        </p>
        <button
          onClick={() => navigate('/pagamento')}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl text-sm transition-colors"
        >
          Voltar para sessões
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/pagamento')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">
              {MONTH_NAMES[session.month - 1]} {session.year}
            </h1>
            <p className="text-xs text-slate-400">Sessão de pagamento</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{paidItems.length}/{items.length} pagas</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(totalPaid)} pago</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {totalPending > 0 && (
            <p className="text-xs text-slate-500 text-right">{formatCurrency(totalPending)} pendente</p>
          )}
        </div>
      </div>

      {/* Bill list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {/* Pending */}
        {pendingItems.map(item => (
          <BillCheckItem
            key={item.bill.id}
            item={item}
            expanded={expandedId === item.bill.id}
            onExpand={() => setExpandedId(expandedId === item.bill.id ? null : item.bill.id)}
            amount={amounts[item.bill.id] ?? String(item.entry.actual_amount || item.bill.expected_amount)}
            onAmountChange={v => setAmounts(a => ({ ...a, [item.bill.id]: v }))}
            onToggle={() => handleToggle(item)}
            loading={markPaid.isPending}
          />
        ))}

        {/* Paid */}
        {paidItems.length > 0 && (
          <>
            <div className="px-4 py-2 bg-slate-900/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagas</p>
            </div>
            {paidItems.map(item => (
              <BillCheckItem
                key={item.bill.id}
                item={item}
                expanded={expandedId === item.bill.id}
                onExpand={() => setExpandedId(expandedId === item.bill.id ? null : item.bill.id)}
                amount={amounts[item.bill.id] ?? String(item.entry.actual_amount)}
                onAmountChange={v => setAmounts(a => ({ ...a, [item.bill.id]: v }))}
                onToggle={() => handleToggle(item)}
                loading={markPaid.isPending}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer CTA */}
      {session.status === 'in_progress' && (
        <div className="px-4 py-4 border-t border-slate-800 shrink-0">
          <button
            onClick={handleComplete}
            disabled={completing || paidItems.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            {completing ? 'Concluindo...' : 'Concluir sessão'}
          </button>
        </div>
      )}
    </div>
  )
}

interface BillCheckItemProps {
  item: SessionBillItem
  expanded: boolean
  onExpand: () => void
  amount: string
  onAmountChange: (v: string) => void
  onToggle: () => void
  loading: boolean
}

function BillCheckItem({ item, expanded, onExpand, amount, onAmountChange, onToggle, loading }: BillCheckItemProps) {
  const isPaid = item.entry.status === 'paid'

  return (
    <div className={clsx('transition-colors', isPaid && 'bg-slate-900/30')}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={loading}
          className={clsx(
            'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
            isPaid
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-600 hover:border-emerald-400'
          )}
        >
          {isPaid && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={onExpand}>
          <p className={clsx('text-sm font-medium', isPaid ? 'text-slate-400 line-through' : 'text-white')}>
            {item.bill.name}
          </p>
          {item.bill.payee_name && (
            <p className="text-xs text-slate-500 mt-0.5">{item.bill.payee_name}</p>
          )}
        </div>

        {/* Amount + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {item.bill.pix_key && !isPaid && (
            <PixCopyButton pixKey={item.bill.pix_key} pixKeyType={item.bill.pix_key_type} />
          )}
          <span className={clsx('text-sm font-semibold', isPaid ? 'text-slate-500' : 'text-white')}>
            {formatCurrency(parseFloat(amount) || 0)}
          </span>
          <button onClick={onExpand} className="text-slate-600 hover:text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded: amount editor */}
      {expanded && !isPaid && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Valor real (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => onAmountChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {item.bill.pix_key && (
            <div className="mt-4">
              <label className="block text-xs text-slate-500 mb-1">Chave PIX</label>
              <PixCopyButton pixKey={item.bill.pix_key} pixKeyType={item.bill.pix_key_type} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
