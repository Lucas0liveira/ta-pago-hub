import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { usePaymentSessions, useStartSession } from '../hooks/usePaymentSessions'
import { Modal } from '../components/ui/Modal'
import { formatCurrency, MONTH_NAMES } from '../lib/formatters'
import type { PaymentSession } from '../types/database'

const STATUS_CONFIG = {
  in_progress: { label: 'Em andamento', icon: Clock, color: 'text-yellow-400' },
  completed: { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-400' },
  abandoned: { label: 'Abandonada', icon: XCircle, color: 'text-slate-500' },
}

export default function PayDayPage() {
  const navigate = useNavigate()
  const { data: sessions = [], isLoading } = usePaymentSessions()
  const startSession = useStartSession()

  const [modalOpen, setModalOpen] = useState(false)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  async function handleStart() {
    const session = await startSession.mutateAsync({ month, year })
    setModalOpen(false)
    navigate(`/pagamento/${session.id}`)
  }

  const active = sessions.filter(s => s.status === 'in_progress')
  const past = sessions.filter(s => s.status !== 'in_progress')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dia do Pagamento</h1>
          <p className="text-sm text-slate-400 mt-0.5">Sessões de pagamento mensais</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova sessão
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active sessions */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Em andamento</h2>
              <div className="space-y-2">
                {active.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/pagamento/${session.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past sessions */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Histórico</h2>
              <div className="space-y-2">
                {past.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/pagamento/${session.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 mb-3">Nenhuma sessão de pagamento ainda.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 text-sm"
              >
                Iniciar primeira sessão
              </button>
            </div>
          )}
        </div>
      )}

      {/* Start session modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova sessão de pagamento"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Selecione o mês e ano para esta sessão de pagamento.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Mês</label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ano</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={startSession.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            <Play className="w-4 h-4" />
            {startSession.isPending ? 'Iniciando...' : `Iniciar sessão — ${MONTH_NAMES[month - 1]} ${year}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function SessionCard({ session, onClick }: { session: PaymentSession; onClick: () => void }) {
  const cfg = STATUS_CONFIG[session.status]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors text-left"
    >
      <div className={clsx('shrink-0', cfg.color)}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">
          {MONTH_NAMES[session.month - 1]} {session.year}
        </p>
        <p className={clsx('text-xs mt-0.5', cfg.color)}>{cfg.label}</p>
      </div>

      {session.total_paid > 0 && (
        <div className="text-right shrink-0">
          <p className="text-emerald-400 font-semibold text-sm">{formatCurrency(session.total_paid)}</p>
          <p className="text-xs text-slate-500">pago</p>
        </div>
      )}

      {session.status === 'in_progress' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shrink-0">
          <Play className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">Continuar</span>
        </div>
      )}
    </button>
  )
}
