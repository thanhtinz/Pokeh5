import { fileURLToPath, URL } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// The game ships inside a Capacitor WebView, so every path stays relative and
// the bundle is kept small enough to install over mobile data.
export default defineConfig({
  base: './',
  plugins: [preact()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'terser',
    terserOptions: { compress: { passes: 2, drop_console: true } },
  },
  server: { host: true, port: 5173 },
});
