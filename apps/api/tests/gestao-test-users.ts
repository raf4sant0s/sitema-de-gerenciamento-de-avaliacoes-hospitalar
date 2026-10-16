// Usuários de exemplo dos testes da gestão (tarefa B16): os e-mails do seed 003_usuarios.sql
// e a senha que os testes gravam SÓ no banco em memória (nunca a SEED_PASSWORD do .env).
// Arquivo sem dependências, para o Playwright (apps/gestao/e2e) poder usar também.

export const TEST_PASSWORD = 'senha-dos-testes-da-gestao';

export const TEST_USERS = {
  superAdmin: 'superadmin@example.com',
  sectorAdmin: 'admin.pa@example.com',
  viewer: 'visualizador.pa@example.com',
};
