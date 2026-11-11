import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    // Der Kontrasttest liest tokens.css als Text (?raw); dafür muss Vitest CSS verarbeiten.
    css: { include: [/tokens\.css/] },
  },
});
