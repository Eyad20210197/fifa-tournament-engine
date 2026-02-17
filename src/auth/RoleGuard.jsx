import UnauthorizedPage from '../pages/auth/UnauthorizedPage'
import { useAuth } from './useAuth'

export default function RoleGuard({ allowedRoles, children }) {
  const { role } = useAuth()

  if (!allowedRoles || allowedRoles.length === 0) {
    return children
  }

  if (!role || !allowedRoles.includes(role)) {
    return <UnauthorizedPage />
  }

  return children
}
