import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser'
  },
  server: {
    port: 3000,
    host: true,
    watch: true
  },
  optimizeDeps: {
    include: []
  }
});
