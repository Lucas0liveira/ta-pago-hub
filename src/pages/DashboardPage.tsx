import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, CheckCircle2, Clock, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { clsx } from 'clsx'
import { useDashboardData } from '../hooks/useDashboard'
import { useGoals } from '../hooks/useGoals'
import { useAuth } from '../stores/authStore'
import { formatCurrency, MONTH_NAMES } from '../lib/formatters'

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const navigate = useNavigate()

  const { data, isLoading } = useDashboardData(month, year)
  const { data: goals = [] } = useGoals()
  const { profile } = useAuth()

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const chartMonthNames = MONTH_NAMES.map(m => m.slice(0, 3))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Olá, {profile?.full_name?.split(' ')[0] ?? 'bem-vindo'} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Resumo financeiro</p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <button onClick={prevMonth} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white w-32 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Receitas"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              icon={TrendingUp}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <SummaryCard
              label="Despesas"
              value={formatCurrency(data?.totalExpenses ?? 0)}
              icon={TrendingDown}
              color="text-red-400"
              bg="bg-red-500/10"
            />
            <SummaryCard
              label="Saldo líquido"
              value={formatCurrency(data?.netBalance ?? 0)}
              icon={Wallet}
              color={(data?.netBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bg={(data?.netBalance ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
            />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-3">Status do mês</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pagas
                  </div>
                  <span className="text-sm font-semibold text-white">{data?.paidCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                    <Clock className="w-3.5 h-3.5" />
                    Pendentes
                  </div>
                  <span className="text-sm font-semibold text-white">{data?.pendingCount ?? 0}</span>
                </div>
                {(data?.pendingCount ?? 0) > 0 && (
                  <button
                    onClick={() => navigate('/pagamento')}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-medium transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Pagar agora
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Annual bar chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Receitas vs Despesas — {year}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.monthlyData.map((d, i) => ({ ...d, name: chartMonthNames[i] }))}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                    formatter={(value: unknown) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="receitas" fill="#10b981" radius={[3, 3, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[3, 3, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category pie */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Despesas por categoria</h2>
              {(data?.categoryBreakdown?.length ?? 0) === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data?.categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {data?.categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color && entry.color !== '#64748b' ? entry.color : PALETTE[index % PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      formatter={(value: unknown) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom row: top expenses + goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top expenses */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Maiores despesas do mês</h2>
              {(data?.topExpenses?.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm">Sem despesas registradas.</p>
              ) : (
                <div className="space-y-3">
                  {data!.topExpenses.map((item, i) => {
                    const maxAmt = data!.topExpenses[0].amount
                    const pct = maxAmt > 0 ? (item.amount / maxAmt) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate max-w-[60%]">{item.name}</span>
                          <span className="text-white font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500/60 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Metas</h2>
                <button
                  onClick={() => navigate('/metas')}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Ver todas
                </button>
              </div>
              {goals.length === 0 ? (
                <div>
                  <p className="text-slate-500 text-sm mb-3">Nenhuma meta cadastrada.</p>
                  <button
                    onClick={() => navigate('/metas')}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Criar primeira meta →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map(goal => {
                    const pct = goal.target_amount > 0
                      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                      : 0
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {goal.icon && <span>{goal.icon}</span>}
                            <span className="text-sm text-slate-300">{goal.name}</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: goal.color ?? '#10b981',
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% concluído</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

function SummaryCard({ label, value, icon: Icon, color, bg }: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">{label}</p>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
          <Icon className={clsx('w-4 h-4', color)} />
        </div>
      </div>
      <p className={clsx('text-xl font-bold', color)}>{value}</p>
    </div>
  )
}
