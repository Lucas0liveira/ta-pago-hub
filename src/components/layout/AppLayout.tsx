import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../stores/authStore'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Page content */}
        <div className="pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
