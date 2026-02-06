import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Control from './pages/Control'
import Display from './pages/Display'
import { useTournamentBootstrap } from './hooks/useTournamentBootstrap'

export default function App() {
  useTournamentBootstrap()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/control" replace />} />
        <Route path="/control" element={<Control />} />
        <Route path="/display" element={<Display />} />
        <Route path="*" element={<Navigate to="/control" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
