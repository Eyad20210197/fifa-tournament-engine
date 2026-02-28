import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { saasRoutes } from './app/routes/saasRoutes'
import ProtectedRoute from './auth/ProtectedRoute'
import RoleGuard from './auth/RoleGuard'
import { ROLES } from './auth/roles'

const Display = lazy(() => import('./pages/Display'))
const Control = lazy(() => import('./pages/Control'))
const AblyTest = lazy(() => import('./pages/AblyTest'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {saasRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element}>
                {(route.children || []).map((child) => (
                  <Route
                    key={child.path || 'index'}
                    index={Boolean(child.index)}
                    path={child.path}
                    element={child.element}
                  />
                ))}
              </Route>
            ))}

            <Route path="/" element={<Navigate to="/saas/login" replace />} />
            <Route path="/login" element={<Navigate to="/saas/login" replace />} />
            <Route
              path="/display"
              element={
                <ProtectedRoute>
                  <Display />
                </ProtectedRoute>
              }
            />
            <Route
              path="/control"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                    <Control />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ably-test"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                    <AblyTest />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/saas/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-[var(--text-secondary)]">
      Loading...
    </div>
  )
}
