import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './components/auth/AuthProvider'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import BillsPage from './pages/BillsPage'
import MonthlyGridPage from './pages/MonthlyGridPage'
import PayDayPage from './pages/PayDayPage'
import PaymentSessionPage from './pages/PaymentSessionPage'
import GoalsPage from './pages/GoalsPage'
import ImportsPage from './pages/ImportsPage'
import SettingsPage from './pages/SettingsPage'
import ReconciliationPage from './pages/ReconciliationPage'
import InsightsPage from './pages/InsightsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/cadastro" element={<RegisterPage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/contas" element={<BillsPage />} />
              <Route path="/mensal" element={<MonthlyGridPage />} />
              <Route path="/pagamento" element={<PayDayPage />} />
              <Route path="/pagamento/:sessionId" element={<PaymentSessionPage />} />
              <Route path="/metas" element={<GoalsPage />} />
              <Route path="/importar" element={<ImportsPage />} />
              <Route path="/importar/:importId/reconciliar" element={<ReconciliationPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
