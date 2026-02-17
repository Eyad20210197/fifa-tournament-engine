import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import LockedPage from '../pages/auth/LockedPage'

export default function ProtectedRoute({ children }) {
  const { ready, isAuthenticated, subscriptionExpired } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-white/80">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/saas/login" replace state={{ from: location.pathname }} />
  }

  if (subscriptionExpired) {
    return <LockedPage />
  }

  return children
}
