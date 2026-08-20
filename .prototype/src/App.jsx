import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypeLayout from './layouts/PrototypeLayout'
import ShowcaseHub from './pages/ShowcaseHub'
import DisplayPage from './pages/DisplayPage'
import ControlPage from './pages/ControlPage'
import SchedulePage from './pages/SchedulePage'
import StationsPage from './pages/StationsPage'
import BrandingPage from './pages/BrandingPage'
import FinancePage from './pages/FinancePage'
import SuperAdminPage from './pages/SuperAdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PrototypeLayout />}>
        <Route index element={<ShowcaseHub />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="control" element={<ControlPage />} />
        <Route path="stations" element={<StationsPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="super-admin" element={<SuperAdminPage />} />
      </Route>
      {/* Fullscreen Spectator Display Route */}
      <Route path="/display" element={<DisplayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
