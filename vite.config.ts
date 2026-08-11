import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// The app ships as a Capacitor WebView bundle, so every path has to be relative
// and the output has to stay small enough to install over mobile data.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        // Phaser dwarfs the game code, so it gets its own long-lived chunk that
        // survives every gameplay patch in the WebView cache.
        manualChunks: { phaser: ['phaser'] },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: true,
    port: 5173,
  },
});
