import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when new code is pushed
      manifest: {
        name: 'Merge & Choo-Choo',
        short_name: 'MCC',
        description: 'Merge & Choo-Choo - Alpha 1',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone', // Removes the browser URL bar for a native app feel
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});