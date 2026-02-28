import { lazy } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from '../../auth/ProtectedRoute'
import RoleGuard from '../../auth/RoleGuard'
import { ROLES } from '../../auth/roles'

const SaasLoginPage = lazy(() => import('../../pages/auth/SaasLoginPage'))
const DashboardHomePage = lazy(() => import('../../pages/dashboard/DashboardHomePage'))
const SuperAdminBusinessesPage = lazy(() => import('../../pages/super-admin/SuperAdminBusinessesPage'))
const SuperAdminAccountsPage = lazy(() => import('../../pages/super-admin/SuperAdminAccountsPage'))
const SuperAdminSubscriptionsPage = lazy(() => import('../../pages/super-admin/SuperAdminSubscriptionsPage'))
const TournamentWizardPage = lazy(() => import('../../pages/tournament/TournamentWizardPage'))
const TournamentListPage = lazy(() => import('../../pages/tournament/TournamentListPage'))
const Finance = lazy(() => import('../../pages/tournament/Finance'))
const BrandingPage = lazy(() => import('../../pages/branding/BrandingPage'))
const UnauthorizedPage = lazy(() => import('../../pages/auth/UnauthorizedPage'))
const LockedPage = lazy(() => import('../../pages/auth/LockedPage'))
const TeamsPage = lazy(() => import('../../pages/business/TeamsPage'))
const ScheduleManagementPage = lazy(() => import('../../pages/business/ScheduleManagementPage'))
const UsersPage = lazy(() => import('../../pages/business/UsersPage'))
const SubscriptionStatusPage = lazy(() => import('../../pages/business/SubscriptionStatusPage'))

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
