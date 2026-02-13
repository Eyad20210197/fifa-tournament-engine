import { Navigate, useLocation } from 'react-router-dom'
import { getSession, isExpired, clearSession } from './authUtils'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const session = getSession()

  if (!session?.isAuthenticated || !session?.expirationDate) {
    clearSession()
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isExpired(session.expirationDate)) {
    clearSession()
    return <Navigate to="/login?reason=expired" replace state={{ from: location.pathname }} />
  }

  return children
}

