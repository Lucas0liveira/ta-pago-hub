import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../stores/authStore'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import MobileProfileBar from './MobileProfileBar'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  return (
    <div className="flex h-[100dvh] bg-slate-950 overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile profile bar */}
        <div className="lg:hidden shrink-0">
          <MobileProfileBar />
        </div>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only, truly fixed */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
