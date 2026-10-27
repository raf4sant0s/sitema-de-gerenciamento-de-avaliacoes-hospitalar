import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import * as dashboardApi from '../../api/dashboard';
import type { BreakdownBy, BreakdownRow, DashboardSummary } from '../../api/dashboard';
import * as sectorsApi from '../../api/sectors';
import type { AuthUser } from '../../auth/session';
import DashboardPage from './DashboardPage';

// Testes da tela do dashboard (A14), com a API "de mentira".

vi.mock('../../api/dashboard');
vi.mock('../../api/sectors');

let currentUser: AuthUser;
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));

// Tempo real "de mentira": o teste guarda a função do dashboard e simula um aviso da API (A15).
let sendNotice: (event: 'response:changed', sectorId: number) => void = () => {};
vi.mock('./useRealtime', () => ({
  useRealtime: (_events: string[], onChange: typeof sendNotice) => {
    sendNotice = onChange;
    return true;
  },
}));

const api = vi.mocked(dashboardApi);

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };

const SUMMARY: DashboardSummary = {
  overallAverage: 3.375,
  totalResponses: 10,
  complete: 8,
  partial: 1,
  abandoned: 1,
  distribution: { '1': 1, '2': 1, '3': 1, '4': 4, '5': 1 },
};

const BREAKDOWN: Record<BreakdownBy, BreakdownRow[]> = {
  sector: [
    { key: '1', label: 'Pronto Atendimento', average: 3.3, count: 7, insufficient: false },
    { key: '3', label: 'Raio-X', average: 4, count: 1, insufficient: false },
  ],
  shift: [
    { key: 'MANHA', label: 'Manhã', average: 3, count: 5, insufficient: false },
    { key: 'NOITE', label: 'Noite', average: 4, count: 2, insufficient: false },
  ],
  team: [
    { key: '1', label: 'Equipe A · Pronto Atendimento', average: 3, count: 5, insufficient: false },
    { key: '2', label: 'Equipe B · Pronto Atendimento', average: null, count: 2, insufficient: true },
  ],
};

beforeEach(() => {
  currentUser = superAdmin;
  vi.mocked(sectorsApi.listSectors).mockResolvedValue([
    { id: 1, name: 'Pronto Atendimento' } as sectorsApi.Sector,
    { id: 3, name: 'Raio-X' } as sectorsApi.Sector,
  ]);
  api.getSummary.mockResolvedValue(SUMMARY);
  api.getSteps.mockResolvedValue([
    { step: 'RECEPCAO', average: 2, count: 7 },
    { step: 'GERAL', average: 3.5, count: 8 },
  ]);
  api.getQuestions.mockResolvedValue([
    { questionId: 5, text: 'Como foi o atendimento na recepção?', step: 'RECEPCAO', average: 1.8, count: 6 },
  ]);
  api.getBreakdown.mockImplementation(async (by) => BREAKDOWN[by]);
  api.getTimeline.mockResolvedValue([
    { date: '2026-10-01', average: 3, count: 5 },
    { date: '2026-10-02', average: 4, count: 3 },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const breadcrumb = () => within(screen.getByRole('navigation', { name: 'Nível do dashboard' }));

describe('tela do dashboard (A14)', () => {
  it('mostra a nota geral com 1 casa decimal, os totais e as carinhas (RN20)', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('3,4')).toBeTruthy();
    expect(screen.getByText('Respostas', { selector: 'p' }).nextSibling?.textContent).toBe('10');
    expect(screen.getByText('Abandonadas').nextSibling?.textContent).toBe('1');
    expect(screen.getByText('Bom')).toBeTruthy(); // carinhas com o nome escrito, não só a cor
    expect(screen.getByText('Recepção')).toBeTruthy(); // média por etapa
  });

  it('começa nos últimos 30 dias, no hospital todo, comparando por setor', async () => {
    render(<DashboardPage />);

    await screen.findByText('Nota geral por setor');
    const [filters] = api.getSummary.mock.calls[0];
    expect(filters.sectorId).toBeUndefined();
    expect(filters.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(filters.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(breadcrumb().getByText('Hospital')).toBeTruthy();
  });

  it('navega hospital → setor → turno → equipe e volta pelo caminho (RN22)', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(await screen.findByRole('button', { name: 'Pronto Atendimento' }));
    expect(await screen.findByText('Nota geral por turno')).toBeTruthy();
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ sectorId: 1 }));

    await user.click(screen.getByRole('button', { name: 'Noite' }));
    expect(await screen.findByText('Nota geral por equipe')).toBeTruthy();
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ sectorId: 1, shift: 'NOITE' }));
    // RN15: equipe com menos de 5 respostas
    expect(screen.getByText('Dados insuficientes')).toBeTruthy();

    await user.click(breadcrumb().getByRole('button', { name: 'Hospital' }));
    expect(await screen.findByText('Nota geral por setor')).toBeTruthy();
    expect(api.getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ sectorId: undefined, shift: undefined, teamId: undefined }),
    );
  });

  it('visualizador fica preso ao próprio setor (RN22)', async () => {
    currentUser = viewerPA;
    render(<DashboardPage />);

    await screen.findByText('Nota geral por turno');
    expect(api.getSummary).toHaveBeenCalledWith(expect.objectContaining({ sectorId: 1 }));
    expect((screen.getByLabelText('Setor') as HTMLSelectElement).disabled).toBe(true);
    expect(breadcrumb().queryByText('Hospital')).toBeNull();
  });

  it('a média de cada pergunta aparece quando há um setor escolhido', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    expect(await screen.findByText(/Escolha um setor para ver a média de cada pergunta/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Setor'), '1');
    expect(await screen.findByText('Como foi o atendimento na recepção?')).toBeTruthy();
  });

  it('sem respostas, avisa em vez de mostrar gráficos vazios', async () => {
    api.getSummary.mockResolvedValue({ ...SUMMARY, overallAverage: null, totalResponses: 0, complete: 0, partial: 0, abandoned: 0 });
    render(<DashboardPage />);

    expect(await screen.findByText('Nenhuma resposta com estes filtros.')).toBeTruthy();
  });

  it('erro da API aparece com ícone e texto', async () => {
    api.getSummary.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Você só tem acesso aos dados do seu setor'));
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Você só tem acesso aos dados do seu setor'));
  });

  it('tempo real: mostra "Ao vivo" e busca de novo quando chega resposta do setor na tela (A15)', async () => {
    currentUser = viewerPA;
    render(<DashboardPage />);
    await screen.findByText('Nota geral por turno');
    expect(screen.getByText('Ao vivo')).toBeTruthy();
    const before = api.getSummary.mock.calls.length;

    sendNotice('response:changed', 3); // outro setor: o visualizador do PA não precisa buscar
    sendNotice('response:changed', 1);
    sendNotice('response:changed', 1); // vários avisos seguidos viram uma busca só

    await waitFor(() => expect(api.getSummary.mock.calls.length).toBe(before + 1), { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(api.getSummary.mock.calls.length).toBe(before + 1);
  });

  it('relatório do setor (RN23): o super admin escolhe o setor nos filtros e baixa o PDF', async () => {
    render(<DashboardPage />);
    const report = await screen.findByRole('region', { name: 'Relatório do setor' });
    const button = within(report).getByRole('button', { name: /Baixar relatório/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true); // hospital todo: ainda sem setor

    await userEvent.selectOptions(screen.getByLabelText('Setor'), 'Pronto Atendimento');
    await userEvent.click(button);

    expect(api.downloadSectorReport).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), expect.stringMatching(/^\d{4}-\d{2}$/));
  });

  it('o visualizador não vê o relatório do setor (RN23)', async () => {
    currentUser = viewerPA;
    render(<DashboardPage />);
    await screen.findByText('3,4'); // espera os números carregarem

    expect(screen.queryByRole('region', { name: 'Relatório do setor' })).toBeNull();
  });

  it('"Exportar Excel" baixa a planilha com os filtros que estão na tela (RN19)', async () => {
    const user = userEvent.setup();
    api.exportExcel.mockResolvedValue();
    render(<DashboardPage />);

    await user.selectOptions(await screen.findByLabelText('Setor'), '1');
    await user.selectOptions(screen.getByLabelText('Turno'), 'NOITE');
    await user.click(screen.getByRole('button', { name: /Exportar Excel/ }));

    expect(api.exportExcel).toHaveBeenCalledWith(expect.objectContaining({ sectorId: 1, shift: 'NOITE' }));
    const [filters] = api.exportExcel.mock.calls[0];
    expect(filters.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
