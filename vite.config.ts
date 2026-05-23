import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false // Terser not installed yet; will enable when available
  },
  server: {
    port: 3000,
    host: true,
    watch: false
  },
  optimizeDeps: {
    include: []
  }
});
