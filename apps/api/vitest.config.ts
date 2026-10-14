import { defineConfig } from 'vitest/config';

// Configuração dos testes da API.
// O JWT_SECRET abaixo é só para os testes (não é o do .env e não vale em lugar nenhum).
export default defineConfig({
  test: {
    env: {
      JWT_SECRET: 'segredo-usado-somente-nos-testes-automaticos-da-api',
    },
  },
});
