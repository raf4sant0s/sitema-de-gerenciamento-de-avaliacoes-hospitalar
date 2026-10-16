import { defineConfig } from '@playwright/test';

// Testes E2E da gestão (README, seção 16; tarefa B16), com o Playwright.
// Comando: npm run test:e2e:gestao (na raiz do projeto).
//
// O Playwright liga sozinho, e desliga no fim:
//   1. uma API de teste com banco em memória e um usuário de cada perfil (apps/api/tests/e2e-gestao-server.ts), porta 3398;
//   2. o site de gestão apontando para ela, porta 5198.
// Portas diferentes das de sempre (3333 e 5174) e das do E2E da pesquisa (3399 e 5199),
// para não atrapalhar quem estiver com o sistema ligado. O banco compartilhado do Supabase nunca é tocado.

const API_PORT = 3398;
const SITE_PORT = 5198;

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
    // Tela de computador: a gestão é usada principalmente no computador.
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx tests/e2e-gestao-server.ts',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        E2E_API_PORT: String(API_PORT),
        CORS_ORIGINS: `http://localhost:${SITE_PORT}`,
        // Segredo só para o teste (não é o do .env e não vale em lugar nenhum).
        JWT_SECRET: 'segredo-usado-somente-nos-testes-e2e-da-gestao',
      },
    },
    {
      command: `npx vite --port ${SITE_PORT} --strictPort`,
      url: `http://localhost:${SITE_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: `http://localhost:${API_PORT}/api`,
        VITE_SOCKET_URL: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
