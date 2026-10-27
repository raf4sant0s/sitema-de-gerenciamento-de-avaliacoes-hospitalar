import { expect, type Page, test } from '@playwright/test';
// Mesma senha e e-mails que a API de teste grava no banco em memória (nunca a do .env).
import { TEST_PASSWORD, TEST_USERS } from '../../api/tests/gestao-test-users';

// Testes E2E da gestão (tarefa B16): um navegador de verdade entra no site de gestão com cada perfil,
// falando com uma API de teste de verdade (banco em memória). Ver playwright.config.ts.

async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu principal' });

test('senha errada mostra a mensagem e não entra', async ({ page }) => {
  await login(page, TEST_USERS.sectorAdmin, 'senha-errada-123');

  await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('super admin vê todas as abas; o TV Wall não está no menu (RN18)', async ({ page }) => {
  await login(page, TEST_USERS.superAdmin);

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  for (const tab of ['Dashboard', 'Comentários', 'Setores', 'Usuários', 'Pesquisas', 'Escala']) {
    await expect(menu(page).getByRole('link', { name: tab })).toBeVisible();
  }
  await expect(menu(page).getByRole('link', { name: 'TV Wall' })).toHaveCount(0);
});

test('TV Wall abre pelo link sem login, só com percentuais, e filtra por setor (RN18, D5)', async ({ page }) => {
  await page.goto('/tv');

  await expect(page.getByRole('heading', { name: 'Painel do hospital' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Satisfeitos por setor' })).toBeVisible();
  await expect(page.getByText('satisfeitos', { exact: true })).toBeVisible();
  // Nada de comentários nem de quantidade de respostas
  await expect(page.getByText(/coment/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*respostas?/i)).toHaveCount(0);

  await page.getByLabel('Setor').selectOption({ label: 'Pronto Atendimento' });
  await expect(page.getByRole('heading', { name: 'Pronto Atendimento', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Satisfeitos por turno' })).toBeVisible();
});

test('admin de setor não vê Setores nem Usuários, e pelo endereço recebe "Sem permissão" (RN16)', async ({ page }) => {
  await login(page, TEST_USERS.sectorAdmin);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await expect(menu(page).getByRole('link', { name: 'Setores' })).toHaveCount(0);
  await expect(menu(page).getByRole('link', { name: 'Usuários' })).toHaveCount(0);
  await expect(menu(page).getByRole('link', { name: 'Pesquisas' })).toBeVisible();

  // Digitar o endereço não adianta: só o super admin mexe em usuários
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible();
});

test('admin de setor trata um comentário com anotação e reabre (RN17)', async ({ page }) => {
  await login(page, TEST_USERS.sectorAdmin);
  await menu(page).getByRole('link', { name: 'Comentários' }).click();
  await expect(page.getByRole('heading', { name: 'Comentários' })).toBeVisible();

  const first = page.getByRole('list', { name: 'Lista de comentários' }).getByRole('listitem').first();
  await first.getByRole('button', { name: 'Tratar' }).click();
  // Sem anotação, o botão fica desativado (anotação obrigatória)
  await expect(first.getByRole('button', { name: 'Marcar como tratado' })).toBeDisabled();
  await first.getByLabel('O que foi feito').fill('Conversamos com a equipe da recepção.');
  await first.getByRole('button', { name: 'Marcar como tratado' }).click();

  await expect(first.getByText('Conversamos com a equipe da recepção.')).toBeVisible();
  await first.getByRole('button', { name: 'Reabrir' }).click();
  await expect(first.getByText('Reaberto: a anotação acima é do tratamento anterior.')).toBeVisible();
});

test('visualizador só olha: escala sem "Salvar" e comentários sem "Tratar" (RN16, D8)', async ({ page }) => {
  await login(page, TEST_USERS.viewer);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  for (const tab of ['Usuários', 'Pesquisas', 'Setores', 'TV Wall']) {
    await expect(menu(page).getByRole('link', { name: tab })).toHaveCount(0);
  }

  await menu(page).getByRole('link', { name: 'Escala' }).click();
  await expect(page.getByRole('heading', { name: 'Escala' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar escala' })).toHaveCount(0);

  await menu(page).getByRole('link', { name: 'Comentários' }).click();
  await expect(page.getByRole('list', { name: 'Lista de comentários' }).getByRole('listitem').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tratar' })).toHaveCount(0);

  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible();
});
