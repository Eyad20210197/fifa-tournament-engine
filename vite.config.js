import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:4000'

  return {
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws/live-state': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg'],
        manifest: {
          name: 'منصة إدارة البطولات',
          short_name: 'إدارة البطولات',
          description: 'نظام إدارة وعرض مباشر للبطولات مع مزامنة فورية بين شاشات التحكم والعرض.',
          lang: 'ar',
          dir: 'rtl',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#07162b',
          background_color: '#07162b',
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: '256x256',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable.svg',
              sizes: '256x256',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  }
})
