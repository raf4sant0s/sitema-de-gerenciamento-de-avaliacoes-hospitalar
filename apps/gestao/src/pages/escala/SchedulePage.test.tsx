import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleItem, Team } from '../../api/schedules';
import { AuthProvider } from '../../auth/AuthContext';
import { type AuthUser, saveSession } from '../../auth/session';
import { daysOfMonth } from './ScheduleGrid';
import SchedulePage from './SchedulePage';

// Testes da tela de escala (tarefa B14), com a API "de mentira" (fetch simulado).

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const sectors = [{ id: 1, name: 'Pronto Atendimento', slug: 'pa', active: true, createdAt: '', surveyUrl: '' }];
const teams: Team[] = [
  { id: 1, sectorId: 1, name: 'Equipe A', active: true },
  { id: 2, sectorId: 1, name: 'Equipe B', active: true },
  { id: 3, sectorId: 1, name: 'Antiga', active: false },
];

function fakeApi(me: AuthUser, schedule: ScheduleItem[]) {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/auth/me')) return json(200, { user: me });
    if (url.endsWith('/sectors')) return json(200, sectors);
    if (url.includes('/teams')) return json(200, teams);
    if (url.includes('/schedules') && options?.method === 'PUT') {
      return json(200, { saved: JSON.parse(String(options.body)).items.length, responsesUpdated: 3 });
    }
    if (url.includes('/schedules')) return json(200, schedule);
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
        <SchedulePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dias do mês', () => {
  it('outubro tem 31 dias e fevereiro de 2028 tem 29', () => {
    expect(daysOfMonth('2026-10')).toHaveLength(31);
    expect(daysOfMonth('2028-02').at(-1)).toBe('2028-02-29');
  });
});

describe('tela de escala (B14)', () => {
  it('mostra a equipe já cadastrada na célula e não oferece equipe desativada', async () => {
    fakeApi(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: 1 }]);
    renderPage();

    await userEvent.clear(await screen.findByLabelText('Mês'));
    await userEvent.type(screen.getByLabelText('Mês'), '2026-10');
    const night = (await screen.findByLabelText('Equipe de 14/10 (qua), Noite (19h às 7h)')) as HTMLSelectElement;

    expect(night.value).toBe('1');
    const names = [...night.options].map((option) => option.textContent);
    expect(names).toEqual(['— sem equipe —', 'Equipe A', 'Equipe B']);
  });

  it('salvar manda só as células alteradas e mostra quantas respostas mudaram de equipe', async () => {
    const fetchMock = fakeApi(adminPA, []);
    renderPage();
    await userEvent.clear(await screen.findByLabelText('Mês'));
    await userEvent.type(screen.getByLabelText('Mês'), '2026-10');

    await userEvent.selectOptions(await screen.findByLabelText('Equipe de 14/10 (qua), Manhã (7h às 13h)'), '2');
    expect(screen.getByText('1 alteração(ões) não salva(s)')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar escala' }));

    expect((await screen.findByRole('status')).textContent).toContain('3 resposta(s)');
    const put = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT')!;
    expect(JSON.parse(String(put[1]!.body))).toEqual({
      items: [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'MANHA', teamId: 2 }],
    });
    expect(screen.getByText('Nenhuma alteração pendente')).toBeTruthy();
  });

  it('visualizador vê a escala, sem campos para escolher nem botão de salvar (RN16)', async () => {
    fakeApi(viewerPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: 1 }]);
    renderPage();
    await userEvent.clear(await screen.findByLabelText('Mês'));
    await userEvent.type(screen.getByLabelText('Mês'), '2026-10');

    expect(await screen.findByText('Equipe A', { selector: 'td span' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar escala' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Adicionar equipe' })).toBeNull();
    expect(screen.queryByLabelText('Equipe de 14/10 (qua), Noite (19h às 7h)')).toBeNull();
  });
});
