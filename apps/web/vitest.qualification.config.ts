import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Qualification must never discover local environment files.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
  },
});
