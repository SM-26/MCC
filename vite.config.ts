import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'


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
  },
  plugins: [svelte()],
})
