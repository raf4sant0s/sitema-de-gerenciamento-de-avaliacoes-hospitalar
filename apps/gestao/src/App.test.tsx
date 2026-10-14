import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { saveSession } from './auth/session';

// Testes do login e do menu, com a API "de mentira" (fetch simulado).

// O dashboard (página inicial, A14) busca indicadores na API. Aqui ele vira só um título,
// para estes testes continuarem testando apenas o login e o menu. O dashboard tem os próprios testes.
vi.mock('./pages/dashboard/DashboardPage', () => ({ default: () => <h1>Dashboard</h1> }));

function apiResponds(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('login e menu do site de gestão', () => {
  it('quem não está logado vai para a tela de login', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('login certo abre o site com o menu do perfil e o nome da pessoa', async () => {
    apiResponds(200, { token: 'token-de-teste', user: { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 10 } });
    render(<App />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@hospital.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-certa');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('navigation', { name: 'Menu principal' })).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Admin de setor')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'TV Wall' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Setores' })).toBeNull();
    // O login fica guardado só nesta aba (decisão da dupla)
    expect(sessionStorage.getItem('gestao.session')).toContain('token-de-teste');
  });

  it('senha errada mostra a mensagem da API, com ícone e texto', async () => {
    apiResponds(401, { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' } });
    render(<App />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@hospital.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('E-mail ou senha incorretos');
  });

  it('visualizador que abre o endereço do TV Wall vê "sem permissão" (RN18)', async () => {
    const viewer = { id: 3, name: 'Beto', role: 'VIEWER' as const, sectorId: 10 };
    saveSession({ token: 'token-do-viewer', user: viewer });
    apiResponds(200, { user: viewer });
    window.history.pushState({}, '', '/tv');

    render(<App />);

    expect(await screen.findByText('Sem permissão')).toBeTruthy();
  });

  it('super admin vê a aba TV Wall', async () => {
    const superAdmin = { id: 1, name: 'Carla', role: 'SUPER_ADMIN' as const, sectorId: null };
    saveSession({ token: 'token-do-super', user: superAdmin });
    apiResponds(200, { user: superAdmin });

    render(<App />);

    expect(await screen.findByRole('link', { name: 'TV Wall' })).toBeTruthy();
  });

  it('botão Sair apaga o login e volta para a tela de entrar', async () => {
    const admin = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN' as const, sectorId: 10 };
    saveSession({ token: 'token-de-teste', user: admin });
    apiResponds(200, { user: admin });
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy();
    expect(sessionStorage.getItem('gestao.session')).toBeNull();
  });
});
