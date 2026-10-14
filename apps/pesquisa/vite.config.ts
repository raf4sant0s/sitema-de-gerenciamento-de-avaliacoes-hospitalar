/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Porta fixa: a API libera esta porta no CORS_ORIGINS (apps/api/.env).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  // Testes (npm test): rodam num navegador simulado (jsdom).
  // A pasta e2e/ é do Playwright (npm run test:e2e), não do Vitest.
  test: { environment: 'jsdom', exclude: ['e2e/**', 'node_modules/**'] },
});
