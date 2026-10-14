import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Comment } from '../../api/comments';
import { AuthProvider } from '../../auth/AuthContext';
import { type AuthUser, saveSession } from '../../auth/session';
import { formatDateTime } from './CommentCard';
import CommentsPage from './CommentsPage';

// Testes da tela de comentários (tarefa B15), com a API "de mentira" (fetch simulado).

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };

const comment = (id: number, text: string, extra: Partial<Comment> = {}): Comment => ({
  id,
  sectorId: 1,
  sectorName: 'Pronto Atendimento',
  type: 'RECLAMACAO',
  text,
  status: 'NEW',
  treatmentNote: null,
  treatedBy: null,
  treatedAt: null,
  createdAt: '2026-10-15T02:00:00.000Z',
  ...extra,
});

function fakeApi(me: AuthUser, items: Comment[]) {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/auth/me')) return json(200, { user: me });
    if (url.includes('/comments/') && options?.method === 'PATCH') {
      const body = JSON.parse(String(options.body));
      const found = items.find((item) => url.endsWith(`/comments/${item.id}`))!;
      return json(200, {
        ...found,
        status: body.status,
        treatmentNote: body.treatmentNote ?? found.treatmentNote,
        treatedBy: body.status === 'TREATED' ? { id: me.id, name: me.name } : null,
        treatedAt: body.status === 'TREATED' ? '2026-10-15T13:00:00.000Z' : null,
      });
    }
    if (url.includes('/comments')) return json(200, { items, total: items.length });
    return json(404, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  saveSession({ token: 'token-de-teste', user: me });
  return fetchMock;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CommentsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('tela de comentários (B15)', () => {
  it('mostra data e hora no horário de Brasília', () => {
    // 02:00 UTC do dia 15 = 23:00 do dia 14 em Brasília
    expect(formatDateTime('2026-10-15T02:00:00.000Z')).toBe('14/10/2026, 23:00');
  });

  it('mostra o texto, o tipo e a situação por escrito', async () => {
    fakeApi(adminPA, [comment(1, 'Esperei muito na recepção')]);
    renderPage();

    const card = (await screen.findByText('“Esperei muito na recepção”')).closest('li')!;
    expect(within(card).getByText('Reclamação')).toBeTruthy();
    expect(within(card).getByText('Novo')).toBeTruthy();
    expect(screen.getByText('1 comentário(s)')).toBeTruthy();
  });

  it('marcar como tratado exige escrever o que foi feito (decisão da dupla)', async () => {
    const fetchMock = fakeApi(adminPA, [comment(1, 'Demora')]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Tratar' }));
    const button = screen.getByRole('button', { name: 'Marcar como tratado' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText('O que foi feito'), 'Conversei com a recepção');
    await userEvent.click(button);

    const list = screen.getByRole('list', { name: 'Lista de comentários' });
    expect(await within(list).findByText('Tratado')).toBeTruthy();
    expect(within(list).getByText('Conversei com a recepção')).toBeTruthy();
    const patch = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH')!;
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ status: 'TREATED', treatmentNote: 'Conversei com a recepção' });
  });

  it('reabrir mantém a anotação e avisa que ela é do tratamento anterior', async () => {
    fakeApi(adminPA, [
      comment(1, 'Demora', {
        status: 'TREATED',
        treatmentNote: 'Liguei para a equipe',
        treatedBy: { id: 2, name: 'Ana' },
        treatedAt: '2026-10-15T13:00:00.000Z',
      }),
    ]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));

    const list = screen.getByRole('list', { name: 'Lista de comentários' });
    expect(await within(list).findByText('Novo')).toBeTruthy();
    expect(within(list).getByText('Liguei para a equipe')).toBeTruthy();
    expect(screen.getByText(/Reaberto/)).toBeTruthy();
  });

  it('visualizador lê os comentários, sem botões de tratar (RN16)', async () => {
    fakeApi(viewerPA, [comment(1, 'Demora')]);
    renderPage();

    expect(await screen.findByText('“Demora”')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tratar' })).toBeNull();
    expect(screen.queryByLabelText('Setor')).toBeNull();
  });

  it('mudar o filtro de situação pede a lista de novo à API', async () => {
    const fetchMock = fakeApi(adminPA, [comment(1, 'Demora')]);
    renderPage();
    await screen.findByText('“Demora”');

    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'TREATED');

    const urls = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/comments?'));
    expect(urls.at(-1)).toContain('status=TREATED');
  });
});
