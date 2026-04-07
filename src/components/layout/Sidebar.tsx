import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
  CheckSquare,
  Target,
  FileUp,
  Settings,
  LogOut,
  Wallet,
  BarChart2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../stores/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Painel' },
  { to: '/contas', icon: Receipt, label: 'Contas' },
  { to: '/mensal', icon: CalendarDays, label: 'Grade Mensal' },
  { to: '/pagamento', icon: CheckSquare, label: 'Dia do Pagamento' },
  { to: '/metas', icon: Target, label: 'Metas' },
  { to: '/importar', icon: FileUp, label: 'Importar Extrato' },
  { to: '/insights', icon: BarChart2, label: 'Insights' },
]

export default function Sidebar() {
  const { financialProfiles, activeFinancialProfileId, setActiveFinancialProfile, profile, signOut } = useAuth()
  const navigate = useNavigate()
  async function handleSignOut() {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">Tá Pago Hub</span>
        </div>
      </div>

      {/* Profile switcher */}
      <div className="px-3 py-3 border-b border-slate-800">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 mb-2">Perfil Financeiro</p>
        <div className="space-y-1">
          {financialProfiles.map(fp => (
            <button
              key={fp.id}
              onClick={() => setActiveFinancialProfile(fp.id)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left',
                fp.id === activeFinancialProfileId
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <span className="text-base leading-none">{fp.icon ?? '💰'}</span>
              <span className="font-medium">{fp.name}</span>
              {fp.id === activeFinancialProfileId && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + settings */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) => clsx(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
            isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Configurações
        </NavLink>

        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs text-emerald-400 font-medium">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <span className="text-sm text-slate-300 truncate flex-1">
            {profile?.full_name ?? 'Usuário'}
          </span>
          <button
            onClick={handleSignOut}
            title="Sair"
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
