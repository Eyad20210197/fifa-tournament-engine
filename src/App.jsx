import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { saasRoutes } from './app/routes/saasRoutes'
import Display from './pages/Display'
import Control from './pages/Control'
import ProtectedRoute from './auth/ProtectedRoute'
import RoleGuard from './auth/RoleGuard'
import { ROLES } from './auth/roles'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
                <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
                  <Control />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/saas/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
