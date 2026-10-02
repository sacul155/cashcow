import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import AtmsPage from './pages/AtmsPage.jsx'
import ServiceCallsPage from './pages/ServiceCallsPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/atms" element={<AtmsPage />} />
              <Route path="/service-calls" element={<ServiceCallsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}