/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Porta fixa: a API libera esta porta no CORS_ORIGINS (apps/api/.env).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  // Testes (npm test): rodam num navegador simulado (jsdom).
  // A pasta e2e/ é do Playwright (npm run test:e2e:gestao), não do Vitest.
  // Mais tempo que o padrão (5 s): num computador ocupado, o navegador simulado demora para abrir.
  test: { environment: 'jsdom', exclude: ['e2e/**', 'node_modules/**'], testTimeout: 20_000 },
});
