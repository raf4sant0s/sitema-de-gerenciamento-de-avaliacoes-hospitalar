import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../api/client';
import * as surveyApi from '../api/survey';
import type { PublicSurvey } from '../api/survey';
import SurveyPage from './SurveyPage';

// A API é simulada: estes testes conferem só as telas e a ordem do fluxo.
vi.mock('../api/survey', async (importOriginal) => {
  const original = await importOriginal<typeof surveyApi>();
  return {
    ...original,
    getSurveyBySlug: vi.fn(),
    getSurveyByCode: vi.fn(),
    startResponse: vi.fn(),
    saveAnswer: vi.fn(),
    sendComment: vi.fn(),
    completeResponse: vi.fn(),
  };
});

const api = vi.mocked(surveyApi);

const SURVEY: PublicSurvey = {
  sector: { id: 1, name: 'Pronto Atendimento', slug: 'pronto-atendimento' },
  survey: {
    id: 10,
    questions: [
      { id: 101, position: 1, text: 'Como foi o atendimento na recepção?', step: 'RECEPCAO', required: false },
      { id: 102, position: 2, text: 'Como foi o atendimento do médico?', step: 'MEDICO', required: false },
      { id: 103, position: 3, text: 'No geral, como você avalia o atendimento do hospital hoje?', step: 'GERAL', required: true },
    ],
  },
};

function openSurvey(url = '/pronto-atendimento') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/c/:code" element={<SurveyPage />} />
        <Route path="/:slug" element={<SurveyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Espera a próxima pergunta aparecer (a tela avança sozinha depois do toque).
const findQuestion = (text: string) => screen.findByRole('heading', { name: text }, { timeout: 2000 });

beforeEach(() => {
  api.getSurveyBySlug.mockResolvedValue(SURVEY);
  api.getSurveyByCode.mockResolvedValue(SURVEY);
  api.startResponse.mockResolvedValue('resposta-1');
  api.saveAnswer.mockResolvedValue({ ok: true });
  api.sendComment.mockResolvedValue({ ok: true });
  api.completeResponse.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SurveyPage', () => {
  it('mostra uma pergunta por tela, sem contador (RN02, RN03)', async () => {
    openSurvey();

    await findQuestion('Como foi o atendimento na recepção?');
    expect(screen.getByText('Recepção')).toBeTruthy();
    expect(screen.queryByText('Como foi o atendimento do médico?')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+\s*(de|\/)\s*\d+/);
  });

  it('o primeiro toque cria a resposta e o seguinte só salva (RN09)', async () => {
    const user = userEvent.setup();
    openSurvey();

    await findQuestion('Como foi o atendimento na recepção?');
    await user.click(screen.getByRole('button', { name: 'Ruim' }));
    expect(api.startResponse).toHaveBeenCalledWith({ sectorId: 1, surveyId: 10, questionId: 101, value: 2 });

    await findQuestion('Como foi o atendimento do médico?');
    await user.click(screen.getByRole('button', { name: 'Ótimo' }));
    expect(api.saveAnswer).toHaveBeenCalledWith('resposta-1', 102, 5);
    expect(api.startResponse).toHaveBeenCalledTimes(1);
  });

  it('"pular" avança sem salvar; a obrigatória fica por último e sem "pular" (RN05, RN07)', async () => {
    const user = userEvent.setup();
    openSurvey();

    await findQuestion('Como foi o atendimento na recepção?');
    await user.click(screen.getByRole('button', { name: 'pular' }));
    await findQuestion('Como foi o atendimento do médico?');
    await user.click(screen.getByRole('button', { name: 'pular' }));

    await findQuestion('No geral, como você avalia o atendimento do hospital hoje?');
    expect(screen.getByText('Avaliação geral')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'pular' })).toBeNull();
    expect(api.startResponse).not.toHaveBeenCalled();
  });

  it('depois da obrigatória vem o comentário; "Enviar" salva e termina (RN11, RN10)', async () => {
    const user = userEvent.setup();
    openSurvey();

    await findQuestion('Como foi o atendimento na recepção?');
    await user.click(screen.getByRole('button', { name: 'pular' }));
    await findQuestion('Como foi o atendimento do médico?');
    await user.click(screen.getByRole('button', { name: 'pular' }));
    await findQuestion('No geral, como você avalia o atendimento do hospital hoje?');
    await user.click(screen.getByRole('button', { name: 'Regular' }));

    await findQuestion('Quer contar mais alguma coisa?');
    expect(screen.getByRole('button', { name: 'Enviar' }).hasAttribute('disabled')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Reclamação' }));
    await user.type(screen.getByLabelText('Seu comentário:'), 'Esperei muito na recepção.');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await findQuestion('Obrigado!');
    expect(api.sendComment).toHaveBeenCalledWith('resposta-1', { type: 'RECLAMACAO', text: 'Esperei muito na recepção.' });
    expect(api.completeResponse).toHaveBeenCalledWith('resposta-1');
  });

  it('"seguir sem comentar" termina sem mandar comentário', async () => {
    const user = userEvent.setup();
    openSurvey();

    for (const text of ['Como foi o atendimento na recepção?', 'Como foi o atendimento do médico?']) {
      await findQuestion(text);
      await user.click(screen.getByRole('button', { name: 'Bom' }));
    }
    await findQuestion('No geral, como você avalia o atendimento do hospital hoje?');
    await user.click(screen.getByRole('button', { name: 'Bom' }));

    await findQuestion('Quer contar mais alguma coisa?');
    await user.click(screen.getByRole('button', { name: 'seguir sem comentar' }));

    await findQuestion('Obrigado!');
    expect(api.sendComment).not.toHaveBeenCalled();
    expect(api.completeResponse).toHaveBeenCalledWith('resposta-1');
  });

  it('se o toque não for salvo, avisa com ícone e texto e não avança', async () => {
    const user = userEvent.setup();
    api.startResponse.mockRejectedValueOnce(new Error('sem internet'));
    openSurvey();

    await findQuestion('Como foi o atendimento na recepção?');
    await user.click(screen.getByRole('button', { name: 'Bom' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Não foi possível salvar/);
    expect(screen.getByRole('heading', { name: 'Como foi o atendimento na recepção?' })).toBeTruthy();
  });

  it('abre pelo código curto (RN01)', async () => {
    openSurvey('/c/PA7K2Q');

    await findQuestion('Como foi o atendimento na recepção?');
    expect(api.getSurveyByCode).toHaveBeenCalledWith('PA7K2Q');
  });

  it('setor inexistente mostra "Pesquisa não encontrada"', async () => {
    api.getSurveyBySlug.mockRejectedValue(new ApiError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado'));
    openSurvey('/nao-existe');

    await findQuestion('Pesquisa não encontrada');
  });
});
