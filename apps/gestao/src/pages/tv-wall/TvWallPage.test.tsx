import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import * as dashboardApi from '../../api/dashboard';
import type { TvData } from '../../api/dashboard';
import TvWallPage from './TvWallPage';

// Testes do TV Wall (A16), com a API e o tempo real "de mentira".

vi.mock('../../api/dashboard');

let sendNotice: (event: string, sectorId: number) => void = () => {};
vi.mock('../dashboard/useRealtime', () => ({
  useRealtime: (_events: string[], onChange: typeof sendNotice) => {
    sendNotice = onChange;
    return true;
  },
}));

const api = vi.mocked(dashboardApi);

const TV: TvData = {
  summary: {
    overallAverage: 3.8,
    totalResponses: 160,
    complete: 127,
    partial: 4,
    abandoned: 29,
    distribution: { '1': 1, '2': 10, '3': 36, '4': 49, '5': 31 },
  },
  sectors: [
    { key: '1', label: 'Pronto Atendimento', average: 3.5, count: 51, insufficient: false },
    { key: '3', label: 'Raio-X', average: 4.2, count: 28, insufficient: false },
  ],
  comments: [
    { id: 3, sectorId: 1, sectorName: 'Pronto Atendimento', type: null, text: 'Foi tudo normal.', status: 'NEW', createdAt: '2026-10-14T23:00:00Z' },
    { id: 2, sectorId: 3, sectorName: 'Raio-X', type: 'RECLAMACAO', text: 'Demorou muito.', status: 'TREATED', createdAt: '2026-10-14T18:00:00Z' },
    { id: 1, sectorId: 1, sectorName: 'Pronto Atendimento', type: 'ELOGIO', text: 'Médico atencioso.', status: 'NEW', createdAt: '2026-10-14T13:00:00Z' },
  ],
  totalComments: 67,
};

beforeEach(() => {
  api.getTv.mockResolvedValue(TV);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TV Wall (A16)', () => {
  it('mostra a nota geral, os setores e os últimos 30 dias', async () => {
    render(<TvWallPage />);

    expect(await screen.findByText('3,8')).toBeTruthy();
    expect(screen.getByText('Últimos 30 dias')).toBeTruthy();
    expect(screen.getByText('28 respostas')).toBeTruthy(); // card do Raio-X
    expect(screen.getByText('4,2')).toBeTruthy();
    const [period] = api.getTv.mock.calls[0];
    expect(period.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('mostra todos os comentários, mais novos primeiro, com o tipo escrito e "Tratado" (RN18)', async () => {
    render(<TvWallPage />);

    const list = await screen.findByRole('list', { name: 'Comentários' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Sem tipo'),
      expect.stringContaining('Reclamação'),
      expect.stringContaining('Elogio'),
    ]);
    expect(items[1].textContent).toContain('Tratado');
    expect(screen.getByText('Mostrando os 3 mais recentes de 67.')).toBeTruthy();
  });

  it('tempo real: "Ao vivo" e busca de novo quando chega resposta ou comentário (A15)', async () => {
    render(<TvWallPage />);
    await screen.findByText('3,8');
    expect(screen.getByText('Ao vivo')).toBeTruthy();

    sendNotice('comment:created', 3);
    sendNotice('response:changed', 1);

    await waitFor(() => expect(api.getTv).toHaveBeenCalledTimes(2), { timeout: 3000 });
  });

  it('erro da API aparece com ícone e texto', async () => {
    api.getTv.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Seu perfil não tem permissão para isso'));
    render(<TvWallPage />);

    expect((await screen.findByRole('alert')).textContent).toContain('Seu perfil não tem permissão para isso');
  });
});
