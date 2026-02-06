import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg'],
      manifest: {
        name: 'نظام بث بطولة FIFA - رمضان 2026',
        short_name: 'بث رمضان 2026',
        description: 'نظام بث بطولة FIFA (واجهة فقط) مع تطبيق ويب تقدمي وتخزين محلي ومزامنة فورية بين /control و /display.',
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
})
