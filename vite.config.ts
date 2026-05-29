import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node'
  },
  plugins: [svelte(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico'],
    manifest: {
      id: '/',
      name: 'Mines & Choo-Choos',
      short_name: 'MCC',
      description: 'Mines & Choo-Choos - Alpha 2',
      theme_color: '#1a1a1a',
      background_color: '#1a1a1a',
      display: 'standalone',
      orientation: 'any',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    }
  })
  ],
});
