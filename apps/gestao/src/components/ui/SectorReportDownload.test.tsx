import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import * as dashboardApi from '../../api/dashboard';
import SectorReportDownload from './SectorReportDownload';

// Testes do "Baixar relatório (PDF)" do setor (RN23), com a API "de mentira".

vi.mock('../../api/dashboard');
const api = vi.mocked(dashboardApi);

const sector = { id: 1, slug: 'pronto-atendimento' };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('baixar relatório do setor (RN23)', () => {
  it('começa no mês atual e baixa o PDF do mês escolhido', async () => {
    api.downloadSectorReport.mockResolvedValue();
    render(<SectorReportDownload sector={sector} idPrefix="t" />);

    const month = screen.getByLabelText('Mês do relatório') as HTMLInputElement;
    const now = new Date();
    expect(month.value).toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    await userEvent.clear(month);
    await userEvent.type(month, '2026-09');
    await userEvent.click(screen.getByRole('button', { name: /Baixar relatório \(PDF\)/ }));

    expect(api.downloadSectorReport).toHaveBeenCalledWith(sector, '2026-09');
  });

  it('sem setor, o botão fica desligado e explica o porquê', () => {
    render(<SectorReportDownload idPrefix="t" />);

    expect((screen.getByRole('button', { name: /Baixar relatório/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Escolha um setor nos filtros para baixar o relatório dele.')).toBeTruthy();
  });

  it('erro da API aparece com ícone e texto', async () => {
    api.downloadSectorReport.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Sem permissão para este setor'));
    render(<SectorReportDownload sector={sector} idPrefix="t" />);

    await userEvent.click(screen.getByRole('button', { name: /Baixar relatório/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('Sem permissão para este setor');
  });
});
