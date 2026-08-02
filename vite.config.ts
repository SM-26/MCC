// import { defineConfig } from 'vite'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Writes src/assets/git-info.txt ("<short-hash>\n<subject>") from the live
 * checkout at dev/build start. Generated, not committed, so the hash always
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
  build: {
    // The service worker precaches every asset up front, ~1.8 MB across 9
    // entries. (The plugin's "precache N entries (KiB)" line understates that:
    // it doesn't count includeAssets. Sum the sw.js manifest for the real
    // number.) So splitting this bundle would change *when* bytes arrive, not
    // how many. The JS weight is real but earned: bits-ui ~115 kB and svelte
    // ~51 kB, all of it genuinely used. Raised past the 500 kB default so the
    // warning stops crying wolf on every build.
    // ponytail: if this ever trips again, that's ~27% growth and worth a look,
    // the upgrade path is lazy-loading views with dynamic import(), not chunking.
    chunkSizeWarningLimit: 1200,
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
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  plugins: [
    gitInfoPlugin(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // favicon.svg is the splash logo, so it has to be precached or an offline
      // launch renders a broken image. The install-dialog screenshots are
      // deliberately NOT precached, the browser fetches those directly, and
      // they'd add ~1.1 MB to the service worker for no offline benefit.
      includeAssets: ['favicon.ico', 'favicon.svg'],
      manifest: {
        name: 'Merge & Choo-Choo',
        short_name: 'MCC',
        description: 'Merge & Choo-Choo - Alpha 1',
        theme_color: '#14213d',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        // WebP only, deliberately. The plugin precaches whatever is listed here,
        // and the WebP pair is 50 KiB against the PNG pair's 279 KiB. The PNGs
        // stay in public/ and are wired as apple-touch-icon in index.html,
        // because iOS does not use manifest icons for Add to Home Screen.
        icons: [
          {
            src: 'pwa-192x192.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: 'pwa-512x512.webp',
            sizes: '512x512',
            type: 'image/webp'
          }
        ],
        // Chrome's "richer install UI" needs at least one `wide` screenshot for
        // desktop and one non-`wide` for mobile. `sizes` must match the files
        // exactly or Chrome silently ignores them.
        screenshots: [
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Mines & Choo-Choos'
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Digging out a mineshaft'
          }
        ]
      }
    })
  ],
})
