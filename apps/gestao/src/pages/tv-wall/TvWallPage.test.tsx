import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import * as dashboardApi from '../../api/dashboard';
import type { PublicTv } from '../../api/dashboard';
import TvWallPage from './TvWallPage';

// Testes do TV Wall público (RN18, D5), com a API e o tempo real "de mentira".

vi.mock('../../api/dashboard');

let sendNotice: (sectorId: number) => void = () => {};
vi.mock('../dashboard/useRealtime', () => ({
  usePublicTvRealtime: (onChange: typeof sendNotice) => {
    sendNotice = onChange;
    return true;
  },
}));

const api = vi.mocked(dashboardApi);

const HOSPITAL: PublicTv = {
  sectors: [
    { id: 1, name: 'Pronto Atendimento' },
    { id: 3, name: 'Raio-X' },
  ],
  overall: { satisfied: 63, distribution: { '1': 4, '2': 8, '3': 25, '4': 40, '5': 23 } },
  steps: [
    { step: 'RECEPCAO', satisfied: 55 },
    { step: 'MEDICO', satisfied: 81 },
  ],
  breakdown: {
    by: 'sector',
    items: [
      { key: '1', label: 'Pronto Atendimento', satisfied: 58 },
      { key: '3', label: 'Raio-X', satisfied: 72 },
    ],
  },
};

const PRONTO_ATENDIMENTO: PublicTv = {
  ...HOSPITAL,
  overall: { satisfied: 58, distribution: { '1': 5, '2': 10, '3': 27, '4': 38, '5': 20 } },
  breakdown: {
    by: 'shift',
    items: [
      { key: 'MANHA', label: 'Manhã', satisfied: 61 },
      { key: 'NOITE', label: 'Noite', satisfied: 49 },
    ],
  },
};

const section = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!;

beforeEach(() => {
  api.getPublicTv.mockImplementation(async (filters) => (filters.sectorId === 1 ? PRONTO_ATENDIMENTO : HOSPITAL));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TV Wall público (RN18, D5)', () => {
  it('começa no hospital todo, nos últimos 30 dias, com as barras em percentual', async () => {
    render(<TvWallPage />);

    expect(await screen.findByText('63%')).toBeTruthy();
    expect(screen.getByText('satisfeitos')).toBeTruthy();
    expect(within(section('Avaliação geral')).getByText('40%')).toBeTruthy(); // Bom
    expect(within(section('Satisfeitos por etapa')).getByText('81%')).toBeTruthy(); // Médico
    expect(within(section('Satisfeitos por setor')).getByText('Raio-X')).toBeTruthy();

    const [filters] = api.getPublicTv.mock.calls[0];
    expect(filters.sectorId).toBeUndefined();
    const days = (Date.parse(filters.to!) - Date.parse(filters.from!)) / 86_400_000;
    expect(days).toBe(29); // 30 dias contando hoje
  });

  it('nunca mostra comentários nem quantidade de respostas (D5)', async () => {
    render(<TvWallPage />);
    await screen.findByText('63%');

    expect(screen.queryByText(/coment/i)).toBeNull();
    expect(screen.queryByText(/\d+\s*respostas?/i)).toBeNull(); // ex.: "160 respostas"
  });

  it('escolher um setor mostra só ele, comparando os turnos', async () => {
    render(<TvWallPage />);
    await screen.findByText('63%');

    await userEvent.selectOptions(screen.getByLabelText('Setor'), 'Pronto Atendimento');

    expect(await screen.findByRole('heading', { name: 'Satisfeitos por turno' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Pronto Atendimento' })).toBeTruthy();
    expect(within(section('Satisfeitos por turno')).getByText('49%')).toBeTruthy();
    expect(api.getPublicTv).toHaveBeenLastCalledWith(expect.objectContaining({ sectorId: 1 }));
  });

  it('mudar o período busca de novo', async () => {
    render(<TvWallPage />);
    await screen.findByText('63%');

    const from = screen.getByLabelText('De');
    await userEvent.clear(from);
    await userEvent.type(from, '2026-10-01');

    await waitFor(() => expect(api.getPublicTv).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01' })));
  });

  it('tempo real: resposta nova no setor da tela busca de novo; de outro setor, não', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<TvWallPage />);
    await screen.findByText('63%');
    await userEvent.selectOptions(screen.getByLabelText('Setor'), 'Pronto Atendimento');
    await screen.findByRole('heading', { name: 'Satisfeitos por turno' });
    const calls = api.getPublicTv.mock.calls.length;

    sendNotice(3); // Raio-X: não é o setor da tela
    await vi.advanceTimersByTimeAsync(1500);
    expect(api.getPublicTv.mock.calls.length).toBe(calls);

    sendNotice(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(api.getPublicTv.mock.calls.length).toBe(calls + 1);
    expect(screen.getByText('Ao vivo')).toBeTruthy();
    vi.useRealTimers();
  });

  it('sem respostas no período, avisa em vez de mostrar barras vazias', async () => {
    api.getPublicTv.mockResolvedValue({ ...HOSPITAL, overall: null, steps: [], breakdown: { by: 'sector', items: [] } });
    render(<TvWallPage />);

    expect(await screen.findByText('Sem respostas no período.')).toBeTruthy();
  });

  it('erro da API aparece com ícone e texto', async () => {
    api.getPublicTv.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'A data inicial é depois da data final'));
    render(<TvWallPage />);

    expect((await screen.findByRole('alert')).textContent).toContain('A data inicial é depois da data final');
  });
});
