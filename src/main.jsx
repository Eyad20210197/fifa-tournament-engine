import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

const disableSw = String(import.meta.env.VITE_DISABLE_SW || '').toLowerCase() === 'true'
console.log('[SW] VITE_DISABLE_SW:', import.meta.env.VITE_DISABLE_SW)

if (!disableSw) {
  registerSW({
    immediate: true,
  })
} else {
  console.log('[SW] Service worker registration disabled by env flag')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>,
)
