import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LanguageProvider } from './i18n/LanguageContext'
import { saasRoutes } from './app/routes/saasRoutes'
import ProtectedRoute from './auth/ProtectedRoute'
import RoleGuard from './auth/RoleGuard'
import { ROLES } from './auth/roles'
import ParticlesBackground from './components/reactbits/ParticlesBackground'

const Display = lazy(() => import('./pages/Display'))
const Control = lazy(() => import('./pages/Control'))
const AblyTest = lazy(() => import('./pages/AblyTest'))

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="relative min-h-screen selection:bg-sky-500/30 selection:text-sky-200">
            {/* ReactBits Live Animated Particles Background */}
            <ParticlesBackground />

            {/* Main Application Routes */}
            <div className="relative z-10">
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
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#030712] text-sm text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
        <p className="font-semibold text-slate-300">Loading FIFA Tournament System...</p>
      </div>
    </div>
  )
}
