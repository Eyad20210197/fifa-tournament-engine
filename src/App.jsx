import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Control from './pages/Control'
import Display from './pages/Display'
import Login from './pages/Login'
import ProtectedRoute from './auth/ProtectedRoute'
import { useTournamentBootstrap } from './hooks/useTournamentBootstrap'

export default function App() {
  useTournamentBootstrap()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/control"
          element={
            <ProtectedRoute>
              <Control />
            </ProtectedRoute>
          }
        />
        <Route
          path="/display"
          element={
            <ProtectedRoute>
              <Display />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
