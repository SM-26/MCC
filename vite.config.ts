import { defineConfig } from 'vite';

export default defineConfig({
  base: '/MCC/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  server: {
    port: 3000,
    host: true
  }
});
