import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// The rule layer under `src/game/` never touches the DOM, so it runs in plain
// Node — which is the point of keeping it renderer-free.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
