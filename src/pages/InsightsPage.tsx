import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight,
  BarChart2, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useInsightsData } from '../hooks/useInsights'
import { useAuth } from '../stores/authStore'
import { formatCurrency, MONTH_NAMES } from '../lib/formatters'

const MONTH_SHORT = MONTH_NAMES.map(m => m.slice(0, 3))
const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

// ─── Tooltip style shared across charts ──────────────────────────────────────
const tooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
}

function pct(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-500">—</span>
  if (Math.abs(value) < 0.5) return (
    <span className="flex items-center gap-0.5 text-xs text-slate-400">
      <Minus className="w-3 h-3" />{pct(value)}
    </span>
  )
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-400">
      <ArrowUpRight className="w-3 h-3" />{pct(value)}
    </span>
  )
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-400">
      <ArrowDownRight className="w-3 h-3" />{pct(value)}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const { financialProfiles, activeFinancialProfileId } = useAuth()
  const { data, isLoading } = useInsightsData(year)

  const activeFinancialProfile = financialProfiles.find(fp => fp.id === activeFinancialProfileId)
  const isBusiness = activeFinancialProfile?.type === 'business'

  const yoyRevDelta = data?.summary.prevRevenue
    ? ((data.summary.totalRevenue - data.summary.prevRevenue) / data.summary.prevRevenue) * 100
    : null
  const yoyExpDelta = data?.summary.prevExpenses
    ? ((data.summary.totalExpenses - data.summary.prevExpenses) / data.summary.prevExpenses) * 100
    : null

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-emerald-400" />
            Insights
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Análise detalhada · {isBusiness ? 'Perfil Empresarial' : 'Perfil Pessoal'}
          </p>
        </div>

        {/* Year navigator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <button onClick={() => setYear(y => y - 1)} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white w-14 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Annual summary cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Receita total"
              value={formatCurrency(data?.summary.totalRevenue ?? 0)}
              sub={yoyRevDelta !== null ? `vs ${year - 1}: ${pct(yoyRevDelta)}` : undefined}
              icon={TrendingUp}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Despesa total"
              value={formatCurrency(data?.summary.totalExpenses ?? 0)}
              sub={yoyExpDelta !== null ? `vs ${year - 1}: ${pct(yoyExpDelta)}` : undefined}
              icon={TrendingDown}
              color="text-red-400"
              bg="bg-red-500/10"
            />
            <StatCard
              label={isBusiness ? 'Lucro líquido' : 'Saldo líquido'}
              value={formatCurrency(data?.summary.totalNet ?? 0)}
              sub={data?.summary.profitMargin !== null
                ? `Margem: ${data!.summary.profitMargin!.toFixed(1)}%`
                : undefined}
              icon={Wallet}
              color={(data?.summary.totalNet ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bg={(data?.summary.totalNet ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
            />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs text-slate-500">Média mensal</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Receita</span>
                <span className="text-green-400 font-semibold">{formatCurrency(data?.summary.avgMonthlyRevenue ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Despesa</span>
                <span className="text-red-400 font-semibold">{formatCurrency(data?.summary.avgMonthlyExpenses ?? 0)}</span>
              </div>
              {(data?.summary.recurringTotal ?? 0) + (data?.summary.oneTimeTotal ?? 0) > 0 && (
                <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Fixo / Variável</span>
                  <span>{formatCurrency(data!.summary.recurringTotal)} / {formatCurrency(data!.summary.oneTimeTotal)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Revenue vs Expenses trend ─────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              Receitas vs Despesas — {year}
              {yoyRevDelta !== null && (
                <span className="ml-2 font-normal">
                  <DeltaBadge value={yoyRevDelta} />
                </span>
              )}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.monthlyData.map((d, i) => ({ ...d, name: MONTH_SHORT[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip {...tooltipStyle} formatter={(v: unknown) => formatCurrency(v as number)} />
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="receitas" fill="#10b981" radius={[3, 3, 0, 0]} name="Receitas" />
                <Bar dataKey="despesas" fill="#ef4444" radius={[3, 3, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Net balance trend ─────────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              {isBusiness ? 'Lucro líquido mensal' : 'Saldo mensal'}
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.monthlyData.map((d, i) => ({ ...d, name: MONTH_SHORT[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip {...tooltipStyle} formatter={(v: unknown) => formatCurrency(v as number)} />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 2" />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                  name={isBusiness ? 'Lucro' : 'Saldo'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Profit margin (business) or Savings rate (personal) ─────────── */}
          {(data?.summary.totalRevenue ?? 0) > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                {isBusiness ? 'Margem de lucro mensal (%)' : 'Taxa de poupança mensal (%)'}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data?.marginData.map((d, i) => ({ ...d, name: MONTH_SHORT[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: unknown) => v !== null ? `${(v as number).toFixed(1)}%` : '—'}
                  />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Bar
                    dataKey="margin"
                    name={isBusiness ? 'Margem' : 'Poupança'}
                    radius={[3, 3, 0, 0]}
                  >
                    {data?.marginData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={(entry.margin ?? 0) >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Stacked category expenses ─────────────────────────────────────── */}
          {(data?.topExpCats.length ?? 0) > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Despesas por categoria — mensal</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.stackedExpenses.map((d, i) => ({ ...d, name: MONTH_SHORT[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip {...tooltipStyle} formatter={(v: unknown) => formatCurrency(v as number)} />
                  <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                  {[...(data?.topExpCats ?? []), 'Outros']
                    .filter(cat => (data?.stackedExpenses ?? []).some(d => (d[cat] ?? 0) > 0))
                    .map((cat, i) => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Category breakdown pies ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense categories */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Despesas por categoria — {year}</h2>
              {(data?.expenseCategoryBreakdown.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data?.expenseCategoryBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data?.expenseCategoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color && entry.color !== '#64748b' ? entry.color : PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                      <Tooltip {...tooltipStyle} formatter={(v: unknown) => formatCurrency(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {data!.expenseCategoryBreakdown.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color && c.color !== '#64748b' ? c.color : PALETTE[i % PALETTE.length] }} />
                          <span className="text-slate-400 truncate max-w-[140px]">{c.name}</span>
                        </div>
                        <span className="text-slate-300 font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Revenue categories */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Receitas por categoria — {year}</h2>
              {(data?.revenueCategoryBreakdown.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data?.revenueCategoryBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data?.revenueCategoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color && entry.color !== '#64748b' ? entry.color : PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                      <Tooltip {...tooltipStyle} formatter={(v: unknown) => formatCurrency(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {data!.revenueCategoryBreakdown.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color && c.color !== '#64748b' ? c.color : PALETTE[i % PALETTE.length] }} />
                          <span className="text-slate-400 truncate max-w-[140px]">{c.name}</span>
                        </div>
                        <span className="text-slate-300 font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Top bills ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top expense bills */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Maiores despesas — {year}</h2>
              {(data?.topExpenseBills.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados.</p>
              ) : (
                <div className="space-y-2.5">
                  {data!.topExpenseBills.map((bill, i) => {
                    const max = data!.topExpenseBills[0].total
                    const pctWidth = max > 0 ? (bill.total / max) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate max-w-[60%]">{bill.name}</span>
                          <span className="text-white font-medium">{formatCurrency(bill.total)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${pctWidth}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top revenue bills */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Maiores receitas — {year}</h2>
              {(data?.topRevenueBills.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados.</p>
              ) : (
                <div className="space-y-2.5">
                  {data!.topRevenueBills.map((bill, i) => {
                    const max = data!.topRevenueBills[0].total
                    const pctWidth = max > 0 ? (bill.total / max) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate max-w-[60%]">{bill.name}</span>
                          <span className="text-white font-medium">{formatCurrency(bill.total)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${pctWidth}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Month-over-month change ───────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Variação mês a mês</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 pr-4 font-medium">Mês</th>
                    <th className="text-right py-2 px-3 font-medium">Receita</th>
                    <th className="text-right py-2 px-3 font-medium">Δ Receita</th>
                    <th className="text-right py-2 px-3 font-medium">Despesa</th>
                    <th className="text-right py-2 px-3 font-medium">Δ Despesa</th>
                    <th className="text-right py-2 pl-3 font-medium">{isBusiness ? 'Lucro' : 'Saldo'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {data?.monthlyData.map((d, i) => {
                    if (d.receitas === 0 && d.despesas === 0) return null
                    const mom = data.momData[i]
                    return (
                      <tr key={i} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 pr-4 font-medium text-slate-200">{MONTH_SHORT[i]}</td>
                        <td className="py-2 px-3 text-right text-green-400">{formatCurrency(d.receitas)}</td>
                        <td className="py-2 px-3 text-right"><DeltaBadge value={mom?.revDelta ?? null} /></td>
                        <td className="py-2 px-3 text-right text-red-400">{formatCurrency(d.despesas)}</td>
                        <td className="py-2 px-3 text-right"><DeltaBadge value={mom?.expDelta ?? null} /></td>
                        <td className={clsx('py-2 pl-3 text-right font-semibold', d.saldo >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {formatCurrency(d.saldo)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string
  value: string
  sub?: string
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
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}
