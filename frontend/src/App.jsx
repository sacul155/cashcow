import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import RequireRole from './RequireRole.jsx'
import Layout from './components/Layout.jsx'
import AtmsPage from './pages/AtmsPage.jsx'
import BranchesPage from './pages/BranchesPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ServiceCallsPage from './pages/ServiceCallsPage.jsx'
import TechniciansPage from './pages/TechniciansPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import { ROLES } from './roles.js'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Every role */}
              <Route path="/atms" element={<AtmsPage />} />
              <Route path="/service-calls" element={<ServiceCallsPage />} />

              {/* Admin and Auditor (the Auditor sees these read-only) */}
              <Route element={<RequireRole roles={[ROLES.ADMIN, ROLES.AUDITOR]} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/technicians" element={<TechniciansPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<RequireRole roles={[ROLES.ADMIN]} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}