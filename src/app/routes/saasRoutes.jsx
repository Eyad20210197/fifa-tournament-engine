import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from '../../auth/ProtectedRoute'
import RoleGuard from '../../auth/RoleGuard'
import { ROLES } from '../../auth/roles'
import SaasLoginPage from '../../pages/auth/SaasLoginPage'
import DashboardHomePage from '../../pages/dashboard/DashboardHomePage'
import SuperAdminBusinessesPage from '../../pages/super-admin/SuperAdminBusinessesPage'
import TournamentWizardPage from '../../pages/tournament/TournamentWizardPage'
import TournamentListPage from '../../pages/tournament/TournamentListPage'
import Finance from '../../pages/tournament/Finance'
import BrandingPage from '../../pages/branding/BrandingPage'
import UnauthorizedPage from '../../pages/auth/UnauthorizedPage'
import LockedPage from '../../pages/auth/LockedPage'

export const saasRoutes = [
  { path: '/saas/login', element: <SaasLoginPage /> },
  {
    path: '/saas',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardHomePage /> },
      {
        path: 'businesses',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminBusinessesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'tournaments',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
            <TournamentListPage />
          </RoleGuard>
        ),
      },
      {
        path: 'tournaments/wizard',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
            <TournamentWizardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'finance',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <Finance />
          </RoleGuard>
        ),
      },
      {
        path: 'branding',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
            <BrandingPage />
          </RoleGuard>
        ),
      },
      { path: 'unauthorized', element: <UnauthorizedPage /> },
      { path: 'locked', element: <LockedPage /> },
    ],
  },
]
