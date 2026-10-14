import { defineConfig } from '@playwright/test';

// Testes E2E do paciente (README, seção 16; tarefa A18), com o Playwright.
// Comando: npm run test:e2e (na raiz do projeto).
//
// O Playwright liga sozinho, e desliga no fim:
//   1. uma API de teste com banco em memória (apps/api/tests/e2e-server.ts), porta 3399;
//   2. o site da pesquisa apontando para ela, porta 5199.
// Portas diferentes das de sempre (3333 e 5173), para não atrapalhar quem estiver com o sistema ligado.
// O banco compartilhado do Supabase nunca é tocado.

const API_PORT = 3399;
const SITE_PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // Um teste por vez: todos usam o mesmo banco em memória.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${SITE_PORT}`,
    // Usa o Microsoft Edge que já vem no Windows (não precisa baixar navegador).
    channel: 'msedge',
    // Tela de celular: a pesquisa é feita para o celular (D6).
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: 'pt-BR',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx tests/e2e-server.ts',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        E2E_API_PORT: String(API_PORT),
        CORS_ORIGINS: `http://localhost:${SITE_PORT}`,
        // Segredo só para o teste (o login não é usado pela pesquisa, mas a API exige um).
        JWT_SECRET: 'segredo-usado-somente-nos-testes-e2e-da-pesquisa',
      },
    },
    {
      command: `npx vite --port ${SITE_PORT} --strictPort`,
      url: `http://localhost:${SITE_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
});
