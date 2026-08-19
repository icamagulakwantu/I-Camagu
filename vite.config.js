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
        theme_color: '#0B3C95',
        background_color: '#FAF8F5',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})