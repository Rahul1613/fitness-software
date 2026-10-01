import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'AIM Fitness',
        short_name: 'AIM Fitness',
        description: 'Official Gym Management and Member Portal for AIM Fitness, Ratnagiri',
        theme_color: '#f97316',
        background_color: '#0f1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Admin Dashboard',
            url: '/admin',
            description: 'Open Owner & Staff Dashboard'
          },
          {
            name: 'QR Scanner',
            url: '/scan',
            description: 'Scan Member QR for Attendance'
          },
          {
            name: 'Member Portal',
            url: '/portal',
            description: 'View My Member Card'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
