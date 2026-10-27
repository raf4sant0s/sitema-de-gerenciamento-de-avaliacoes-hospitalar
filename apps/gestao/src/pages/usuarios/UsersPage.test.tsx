import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Sector } from '../../api/sectors';
import type { User } from '../../api/users';
import { AuthProvider } from '../../auth/AuthContext';
import { type AuthUser, saveSession } from '../../auth/session';
import MyPasswordPage from '../minha-senha/MyPasswordPage';
import UsersPage from './UsersPage';

// Testes das telas de usuários e "Minha senha", com a API "de mentira" (fetch simulado).

const sector = (id: number, name: string): Sector => ({
  id,
  name,
  slug: name.toLowerCase(),
  code: 'ABC234',
  active: true,
  createdAt: '2026-10-14T12:00:00.000Z',
  surveyUrl: '',
  shortUrl: '',
});

const person = (id: number, name: string, role: User['role'], sectorId: number | null): User => ({
  id,
  name,
  email: `${name.toLowerCase()}@hospital.com`,
  role,
  sectorId,
  active: true,
  createdAt: '2026-10-14T12:00:00.000Z',
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Simula a API: lista, cadastro e alteração; guarda as chamadas para os testes conferirem.
function fakeApi(me: AuthUser, users: User[], sectors: Sector[]) {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    if (url.endsWith('/auth/me')) return json(200, { user: me });
    if (url.endsWith('/sectors')) return json(200, sectors);
    if (url.endsWith('/users') && options?.method === 'POST') return json(201, { ...person(99, body.name, body.role, body.sectorId), email: body.email });
    if (url.includes('/users/') && options?.method === 'PUT') {
      const id = Number(url.split('/').pop());
      return json(200, { ...users.find((user) => user.id === id)!, ...body });
    }
    if (url.endsWith('/users')) return json(200, users);
    if (url.endsWith('/auth/password')) {
      return body.currentPassword === 'senha-certa'
        ? json(200, { ok: true })
        : json(400, { error: { code: 'WRONG_PASSWORD', message: 'A senha atual está incorreta' } });
    }
    return json(404, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  saveSession({ token: 'token-de-teste', user: me });
  return fetchMock;
}

function renderAs(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{page}</AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 }; // usado em "Minha senha"
const sectors = [sector(1, 'Pronto Atendimento'), sector(2, 'Raio-X')];

describe('tela de usuários (B12)', () => {
  it('mostra perfil e setor de cada usuário', async () => {
    fakeApi(superAdmin, [person(1, 'Carla', 'SUPER_ADMIN', null), person(3, 'Beto', 'VIEWER', 1)], sectors);
    renderAs(<UsersPage />);

    const beto = (await screen.findByRole('heading', { name: 'Beto' })).closest('li')!;
    expect(within(beto).getByText('Visualizador')).toBeTruthy();
    expect(within(beto).getByText(/Pronto Atendimento/)).toBeTruthy();
  });

  it('super admin escolhe qualquer perfil; o setor some quando o perfil é super admin', async () => {
    fakeApi(superAdmin, [], sectors);
    renderAs(<UsersPage />);

    const role = await screen.findByLabelText('Perfil');
    expect(within(role).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Super admin',
      'Admin de setor',
      'Visualizador',
    ]);
    expect(screen.getByLabelText('Setor')).toBeTruthy();

    await userEvent.selectOptions(role, 'SUPER_ADMIN');
    expect(screen.queryByLabelText('Setor')).toBeNull();
  });

  it('super admin cadastra um visualizador no setor escolhido', async () => {
    const fetchMock = fakeApi(superAdmin, [], sectors);
    renderAs(<UsersPage />);

    await userEvent.selectOptions(await screen.findByLabelText('Perfil'), 'VIEWER');
    await userEvent.selectOptions(screen.getByLabelText('Setor'), 'Raio-X');
    await userEvent.type(screen.getByLabelText('Nome'), 'Gil');
    await userEvent.type(screen.getByLabelText('E-mail'), 'gil@hospital.com');
    await userEvent.type(screen.getByLabelText('Senha inicial'), 'senha-inicial');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    expect(await screen.findByRole('heading', { name: 'Gil' })).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      name: 'Gil',
      email: 'gil@hospital.com',
      password: 'senha-inicial',
      role: 'VIEWER',
      sectorId: 2,
    });
  });

  it('o botão de cadastrar só libera com senha de 8 caracteres ou mais', async () => {
    fakeApi(superAdmin, [], sectors);
    renderAs(<UsersPage />);

    await userEvent.selectOptions(await screen.findByLabelText('Setor'), 'Pronto Atendimento');
    await userEvent.type(screen.getByLabelText('Nome'), 'Gil');
    await userEvent.type(screen.getByLabelText('E-mail'), 'gil@hospital.com');
    await userEvent.type(screen.getByLabelText('Senha inicial'), '1234567');
    const button = screen.getByRole('button', { name: 'Cadastrar usuário' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText('Senha inicial'), '8');
    expect(button.disabled).toBe(false);
  });

  it('a própria conta não tem "Desativar" nem "Redefinir senha" (decisão da dupla)', async () => {
    fakeApi(superAdmin, [person(1, 'Carla', 'SUPER_ADMIN', null), person(3, 'Beto', 'VIEWER', 1)], sectors);
    renderAs(<UsersPage />);

    const me = (await screen.findByText('(você)')).closest('li')!;
    expect(within(me).queryByRole('button', { name: 'Desativar' })).toBeNull();
    expect(within(me).queryByRole('button', { name: 'Redefinir senha' })).toBeNull();

    const beto = screen.getByRole('heading', { name: 'Beto' }).closest('li')!;
    expect(within(beto).getByRole('button', { name: 'Desativar' })).toBeTruthy();
  });

  it('desativar pede confirmação e manda só a situação', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = fakeApi(superAdmin, [person(3, 'Beto', 'VIEWER', 1)], sectors);
    renderAs(<UsersPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));

    expect(await screen.findByText('Inativo')).toBeTruthy();
    const put = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT')!;
    expect(JSON.parse(String(put[1]!.body))).toEqual({ active: false });
  });
});

describe('tela "Minha senha" (B12)', () => {
  async function fill(current: string, next: string, repeat: string) {
    await userEvent.type(screen.getByLabelText('Senha atual'), current);
    await userEvent.type(screen.getByLabelText('Nova senha'), next);
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), repeat);
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
  }

  it('com a senha atual certa, mostra que trocou', async () => {
    fakeApi(adminPA, [], []);
    renderAs(<MyPasswordPage />);

    await fill('senha-certa', 'minha-nova-senha', 'minha-nova-senha');
    expect((await screen.findByRole('status')).textContent).toContain('Senha trocada');
  });

  it('senha atual errada mostra a mensagem da API', async () => {
    fakeApi(adminPA, [], []);
    renderAs(<MyPasswordPage />);

    await fill('errada', 'minha-nova-senha', 'minha-nova-senha');
    expect((await screen.findByRole('alert')).textContent).toContain('A senha atual está incorreta');
  });

  it('confirmação diferente da nova senha nem chega a chamar a API', async () => {
    const fetchMock = fakeApi(adminPA, [], []);
    renderAs(<MyPasswordPage />);

    await fill('senha-certa', 'minha-nova-senha', 'outra-senha-xx');
    expect((await screen.findByRole('alert')).textContent).toContain('diferentes');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/auth/password'))).toBe(false);
  });
});
