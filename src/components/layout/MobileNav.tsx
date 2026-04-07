import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, FileUp, CheckSquare, BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Painel' },
  { to: '/contas', icon: Receipt, label: 'Contas' },
  { to: '/pagamento', icon: CheckSquare, label: 'Pagar' },
  { to: '/importar', icon: FileUp, label: 'Importar' },
  { to: '/insights', icon: BarChart2, label: 'Insights' },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex z-50 safe-area-bottom">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => clsx(
            'flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors',
            isActive ? 'text-emerald-400' : 'text-slate-500'
          )}
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
