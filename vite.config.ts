// import { defineConfig } from 'vite'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Writes src/assets/git-info.txt ("<short-hash>\n<subject>") from the live
 * checkout at dev/build start. Generated, not committed — so the hash always
 * matches what you're actually building. Replaces the old post-commit hook.
 */
function gitInfoPlugin(): Plugin {
  const write = () => {
    const file = fileURLToPath(new URL('./src/assets/git-info.txt', import.meta.url));
    try {
      const hash = execSync('git rev-parse --short HEAD').toString().trim();
      const msg = execSync('git log -1 --pretty=%s').toString().trim();
      writeFileSync(file, `${hash}\n${msg}`);
    } catch {
      // No git / shallow checkout (e.g. some CI): leave a placeholder.
      writeFileSync(file, 'dev\nlocal build');
    }
  };
  return { name: 'git-info', buildStart: write, configureServer: write };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
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
  plugins: [
    gitInfoPlugin(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Merge & Choo-Choo',
        short_name: 'MCC',
        description: 'Merge & Choo-Choo - Alpha 1',
        theme_color: '#14213d',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
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
  ],
})
