import { Navigate, Outlet } from 'react-router'

import { useAuth } from './AuthContext.jsx'
import { homePathFor } from './roles.js'

// Place inside ProtectedRoute. Lets only the listed roles see the nested pages;
// everyone else is sent to their own home page.
export default function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <Outlet />
}