import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Trophy, Calendar } from 'lucide-react'
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

  const [cardIndex, setCardIndex] = useState(0)
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

  const orderedItems = [
    ...items.filter(i => i.entry.status !== 'paid'),
    ...items.filter(i => i.entry.status === 'paid'),
  ]

  const paidCount = items.filter(i => i.entry.status === 'paid').length
  const totalPaid = items
    .filter(i => i.entry.status === 'paid')
    .reduce((s, i) => s + i.entry.actual_amount, 0)
  const progress = items.length > 0 ? (paidCount / items.length) * 100 : 0
  const safeIndex = Math.min(cardIndex, orderedItems.length - 1)

  async function handleMarkPaid(item: SessionBillItem) {
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

    if (!isPaid) {
      const nextUnpaid = orderedItems.findIndex(
        (it, i) => i > safeIndex && it.entry.status !== 'paid'
      )
      if (nextUnpaid !== -1) setTimeout(() => setCardIndex(nextUnpaid), 250)
    }
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
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
          <Trophy className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sessão concluída!</h1>
        <p className="text-slate-400 mb-1">{MONTH_NAMES[session.month - 1]} {session.year}</p>
        <p className="text-4xl font-bold text-emerald-400 mt-4 mb-2">{formatCurrency(totalPaid)}</p>
        <p className="text-slate-400 text-sm mb-10">{paidCount} de {items.length} contas pagas</p>
        <button
          onClick={() => navigate('/pagamento')}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Voltar para sessões
        </button>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/pagamento')} className="text-slate-400 hover:text-white transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-white">{MONTH_NAMES[session.month - 1]} {session.year}</h1>
            <p className="text-xs text-slate-500">Dia do pagamento</p>
          </div>
          <span className="text-xs text-slate-400 tabular-nums">{paidCount}/{items.length} pagas</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Carousel area */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-2xl mx-auto w-full">
        {/* Nav + dots */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setCardIndex(i => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[240px] px-1 py-1">
            {orderedItems.map((item, i) => (
              <button
                key={item.bill.id}
                onClick={() => setCardIndex(i)}
                title={item.bill.name}
                className={clsx(
                  'shrink-0 rounded-full transition-all duration-200',
                  i === safeIndex
                    ? 'w-5 h-2 bg-emerald-500'
                    : item.entry.status === 'paid'
                    ? 'w-2 h-2 bg-emerald-500/30'
                    : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
                )}
              />
            ))}
          </div>

          <button
            onClick={() => setCardIndex(i => Math.min(orderedItems.length - 1, i + 1))}
            disabled={safeIndex === orderedItems.length - 1}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Sliding card track */}
        <div className="flex-1 px-4 pb-4 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(calc(-${safeIndex} * (100% + 1rem)))`,
              width: `calc(${orderedItems.length} * 100% + ${orderedItems.length - 1} * 1rem)`,
              gap: '1rem',
            }}
          >
            {orderedItems.map((item, i) => (
              <BillCard
                key={item.bill.id}
                item={item}
                isActive={i === safeIndex}
                amount={amounts[item.bill.id] ?? String(item.entry.actual_amount || item.bill.expected_amount)}
                onAmountChange={v => setAmounts(a => ({ ...a, [item.bill.id]: v }))}
                onTogglePaid={() => handleMarkPaid(item)}
                loading={markPaid.isPending}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      {session.status === 'in_progress' && paidCount > 0 && (
        <div className="shrink-0 border-t border-slate-800 px-4 py-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total pago</span>
            <span className="text-sm font-semibold text-emerald-400">{formatCurrency(totalPaid)}</span>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {completing ? 'Concluindo...' : `Concluir · ${paidCount}/${items.length} pagas`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Bill card ────────────────────────────────────────────────────────────────
interface BillCardProps {
  item: SessionBillItem
  isActive: boolean
  amount: string
  onAmountChange: (v: string) => void
  onTogglePaid: () => void
  loading: boolean
}

function BillCard({ item, isActive, amount, onAmountChange, onTogglePaid, loading }: BillCardProps) {
  const isPaid = item.entry.status === 'paid'
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && !isPaid) setTimeout(() => inputRef.current?.focus(), 350)
  }, [isActive, isPaid])

  return (
    <div className="flex-shrink-0 w-full h-full flex items-center justify-center">
      <div
        className={clsx(
          'w-full max-h-full flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden',
          'shadow-2xl',
          isPaid
            ? 'bg-slate-900/60 border-emerald-500/20'
            : 'bg-slate-900 border-slate-700'
        )}
      >
        {/* Card header stripe */}
        <div className={clsx(
          'h-1.5 w-full shrink-0',
          isPaid ? 'bg-emerald-500/30' : 'bg-emerald-500'
        )} />

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between p-6 gap-5 overflow-y-auto">
          {/* Bill identity */}
          <div className="text-center space-y-1">
            {isPaid && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Paga
              </div>
            )}
            <h2 className={clsx(
              'text-2xl font-bold leading-tight',
              isPaid ? 'text-slate-500 line-through' : 'text-white'
            )}>
              {item.bill.name}
            </h2>
            {item.bill.payee_name && (
              <p className="text-slate-400 text-sm">{item.bill.payee_name}</p>
            )}
            {item.bill.due_day && (
              <div className="inline-flex items-center gap-1 text-slate-500 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                Vence dia {item.bill.due_day}
              </div>
            )}
          </div>

          {/* PIX — always shown when available */}
          {item.bill.pix_key && (
            <PixCopyButton
              pixKey={item.bill.pix_key}
              pixKeyType={item.bill.pix_key_type}
              className="w-full justify-center py-3 text-sm"
            />
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs text-slate-500 mb-2 text-center tracking-wide uppercase">
              Valor (R$)
            </label>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => onAmountChange(e.target.value)}
              disabled={isPaid}
              className={clsx(
                'w-full px-4 py-3.5 rounded-xl border text-2xl font-bold text-center',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors',
                isPaid
                  ? 'bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-700 text-white'
              )}
            />
            {!isPaid && item.bill.expected_amount !== parseFloat(amount) && (
              <p className="text-xs text-slate-600 text-center mt-1.5">
                Previsto: {formatCurrency(item.bill.expected_amount)}
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 px-6 pb-6">
          <button
            onClick={onTogglePaid}
            disabled={loading}
            className={clsx(
              'w-full py-4 rounded-xl font-bold text-base transition-all duration-200',
              isPaid
                ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400'
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/20'
            )}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPaid ? (
              'Desmarcar pagamento'
            ) : (
              '✓  Marcar como pago'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
