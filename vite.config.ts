// import { defineConfig } from 'vite'
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'; // ponytail: placeholder — wire when PWA config is ready

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  publicDir: 'public',
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
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  plugins: [svelte()],
})
