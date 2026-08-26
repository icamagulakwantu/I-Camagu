import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  navigateFallbackDenylist: [/^\/api\//],
},
      manifest: {
        name: 'iCamagu',
        short_name: 'iCamagu',
        description: 'Ceremony planning, stokvel savings, and bulk purchasing for Xhosa communities',
        theme_color: '#c45c26',
        background_color: '#f5f3ee',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/android-chrome-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/android-chrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})