import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from '../../auth/ProtectedRoute'
import RoleGuard from '../../auth/RoleGuard'
import { ROLES } from '../../auth/roles'
import SaasLoginPage from '../../pages/auth/SaasLoginPage'
import DashboardHomePage from '../../pages/dashboard/DashboardHomePage'
import SuperAdminBusinessesPage from '../../pages/super-admin/SuperAdminBusinessesPage'
import SuperAdminAccountsPage from '../../pages/super-admin/SuperAdminAccountsPage'
import SuperAdminSubscriptionsPage from '../../pages/super-admin/SuperAdminSubscriptionsPage'
import TournamentWizardPage from '../../pages/tournament/TournamentWizardPage'
import TournamentListPage from '../../pages/tournament/TournamentListPage'
import Finance from '../../pages/tournament/Finance'
import BrandingPage from '../../pages/branding/BrandingPage'
import UnauthorizedPage from '../../pages/auth/UnauthorizedPage'
import LockedPage from '../../pages/auth/LockedPage'
import TeamsPage from '../../pages/business/TeamsPage'
import ScheduleManagementPage from '../../pages/business/ScheduleManagementPage'
import UsersPage from '../../pages/business/UsersPage'
import SubscriptionStatusPage from '../../pages/business/SubscriptionStatusPage'

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
        path: 'accounts',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminAccountsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'businesses',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminBusinessesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'subscriptions',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminSubscriptionsPage />
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
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <TournamentWizardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'teams',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <TeamsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'schedule',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
            <ScheduleManagementPage />
          </RoleGuard>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'subscription-status',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <SubscriptionStatusPage />
          </RoleGuard>
        ),
      },
      {
        path: 'finance',
        element: (
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
            <Finance />
          </RoleGuard>
        ),
      },
      {
        path: 'branding',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <BrandingPage />
          </RoleGuard>
        ),
      },
      { path: 'unauthorized', element: <UnauthorizedPage /> },
      { path: 'locked', element: <LockedPage /> },
    ],
  },
]
