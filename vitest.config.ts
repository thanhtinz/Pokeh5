import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// The rule layer under `src/game/` never touches the DOM, so it runs in plain
// Node — which is the point of keeping it renderer-free.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Máy chủ viết bằng .mjs thuần — không qua bundler, không cần bước dựng — nên
  // bài kiểm của nó nằm cạnh nó chứ không nằm trong `tests/`, vốn do tsconfig
  // của client quản.
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'server/**/*.test.mjs'] },
});
