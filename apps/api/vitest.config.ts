import { defineConfig } from 'vitest/config';

// Configuração dos testes da API.
// O JWT_SECRET abaixo é só para os testes (não é o do .env e não vale em lugar nenhum).
export default defineConfig({
  test: {
    env: {
      JWT_SECRET: 'segredo-usado-somente-nos-testes-automaticos-da-api',
    },
    // Vários testes criam um PostgreSQL em memória (PGlite). Rodando todos juntos, criar o banco
    // pode passar de 10 segundos num computador mais lento; o padrão do Vitest (5 s e 10 s) não basta.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
