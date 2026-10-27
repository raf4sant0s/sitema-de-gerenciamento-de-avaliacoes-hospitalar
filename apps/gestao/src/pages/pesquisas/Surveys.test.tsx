import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Question, Survey } from '../../api/surveys';
import { AuthProvider } from '../../auth/AuthContext';
import { type AuthUser, saveSession } from '../../auth/session';
import SurveyDetailPage from './SurveyDetailPage';
import SurveysPage from './SurveysPage';

// Testes das telas de pesquisas (tarefa B13), com a API "de mentira" (fetch simulado).

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const sectors = [{ id: 1, name: 'Pronto Atendimento', slug: 'pa', active: true, createdAt: '', surveyUrl: '' }];

const survey = (id: number, title: string, active: boolean): Survey => ({ id, sectorId: 1, title, active, createdAt: '' });
const question = (id: number, text: string, extra: Partial<Question> = {}): Question => ({
  id,
  surveyId: 1,
  position: id,
  text,
  step: 'RECEPCAO',
  required: false,
  active: true,
  answerCount: 0,
  ...extra,
});

function fakeApi(handler: (url: string, options?: RequestInit) => Response | undefined) {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/auth/me')) return json(200, { user: superAdmin });
    if (url.endsWith('/sectors')) return json(200, sectors);
    return handler(url, options) ?? json(404, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  saveSession({ token: 'token-de-teste', user: superAdmin });
  return fetchMock;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/pesquisas" element={<SurveysPage />} />
          <Route path="/pesquisas/:id" element={<SurveyDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const body = (options?: RequestInit) => JSON.parse(String(options?.body));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('lista de pesquisas', () => {
  it('ativar avisa que a pesquisa ativa do setor vai ser desativada (RN02) e atualiza as duas', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fakeApi((url, options) => {
      if (url.endsWith('/surveys/2') && options?.method === 'PUT') return json(200, survey(2, 'Nova', true));
      if (url.endsWith('/surveys')) return json(200, [survey(2, 'Nova', false), survey(1, 'Antiga', true)]);
    });
    renderAt('/pesquisas');

    const nova = (await screen.findByRole('heading', { name: 'Nova' })).closest('li')!;
    await userEvent.click(within(nova).getByRole('button', { name: 'Ativar' }));

    expect(confirm.mock.calls[0][0]).toContain('"Antiga" vai ser desativada');
    expect(await within(nova).findByText('Ativa')).toBeTruthy();
    const antiga = screen.getByRole('heading', { name: 'Antiga' }).closest('li')!;
    expect(within(antiga).getByText('Inativa')).toBeTruthy();
  });

  it('criar pesquisa manda setor e título', async () => {
    const fetchMock = fakeApi((url, options) => {
      if (url.endsWith('/surveys') && options?.method === 'POST') return json(201, survey(5, body(options).title, false));
      if (url.endsWith('/surveys')) return json(200, []);
    });
    renderAt('/pesquisas');

    await userEvent.type(await screen.findByLabelText('Título'), 'Pesquisa do PA');
    await userEvent.selectOptions(screen.getByLabelText('Setor'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar pesquisa' }));

    expect(await screen.findByRole('heading', { name: 'Pesquisa do PA' })).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(body(post[1])).toEqual({ sectorId: 1, title: 'Pesquisa do PA' });
  });
});

describe('perguntas de uma pesquisa', () => {
  const list = [
    question(10, 'Recepção?'),
    question(11, 'Enfermagem?', { step: 'ENFERMAGEM' }),
    question(12, 'No geral?', { required: true, step: 'GERAL' }),
  ];

  function detailApi(extra?: (url: string, options?: RequestInit) => Response | undefined) {
    return fakeApi((url, options) => {
      const fromExtra = extra?.(url, options);
      if (fromExtra) return fromExtra;
      if (url.endsWith('/surveys/1/questions') && !options?.method) return json(200, list);
      if (url.endsWith('/surveys/1')) return json(200, survey(1, 'Pesquisa do PA', false));
    });
  }

  it('mostra a obrigatória por último, marcada, sem subir/descer nem desativar (RN05)', async () => {
    detailApi();
    renderAt('/pesquisas/1');

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')!.textContent)).toEqual(['Recepção?', 'Enfermagem?', 'No geral?']);
    const required = items[2];
    expect(within(required).getByText('Obrigatória · sempre a última')).toBeTruthy();
    expect(within(required).queryByRole('button', { name: /Subir|Descer/ })).toBeNull();
    expect(within(required).queryByRole('button', { name: 'Desativar' })).toBeNull();
  });

  it('descer a primeira pergunta manda a nova ordem só com as opcionais', async () => {
    const fetchMock = detailApi((url, options) => {
      if (url.endsWith('/questions/order')) return json(200, [list[1], list[0], list[2]]);
    });
    renderAt('/pesquisas/1');

    await userEvent.click(await screen.findByRole('button', { name: 'Descer a pergunta "Recepção?"' }));

    const order = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/questions/order'))!;
    expect(body(order[1])).toEqual({ ids: [11, 10] });
    const items = await screen.findAllByRole('listitem');
    expect(items[0].querySelector('p')!.textContent).toBe('Enfermagem?');
  });

  it('mudar o texto de pergunta já respondida pede confirmação (decisão da dupla)', async () => {
    const answered = [question(10, 'Recepção?', { answerCount: 7 }), list[2]];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = fakeApi((url, options) => {
      if (url.endsWith('/surveys/1/questions')) return json(200, answered);
      if (url.endsWith('/surveys/1') && !options?.method) return json(200, survey(1, 'P', false));
    });
    renderAt('/pesquisas/1');

    const item = (await screen.findByText('Recepção?')).closest('li')!;
    await userEvent.click(within(item).getByRole('button', { name: 'Editar' }));
    const textField = within(item).getByLabelText('Pergunta');
    await userEvent.clear(textField);
    await userEvent.type(textField, 'Como foi a recepção?');
    await userEvent.click(within(item).getByRole('button', { name: 'Salvar' }));

    expect(confirm.mock.calls[0][0]).toContain('já recebeu 7 resposta(s)');
    // A pessoa cancelou: nada foi enviado
    expect(fetchMock.mock.calls.some(([url, options]) => String(url).includes('/questions/10') && options?.method === 'PUT')).toBe(false);
  });

  it('adicionar pergunta manda texto e etapa, e ela entra antes da obrigatória', async () => {
    const fetchMock = detailApi((url, options) => {
      if (url.endsWith('/surveys/1/questions') && options?.method === 'POST') {
        return json(201, question(13, body(options).text, { step: body(options).step }));
      }
    });
    renderAt('/pesquisas/1');

    await userEvent.type(await screen.findByLabelText('Pergunta'), 'Como foi o médico?');
    await userEvent.selectOptions(screen.getByLabelText('Etapa da jornada'), 'MEDICO');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar pergunta' }));

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')!.textContent)).toEqual(['Recepção?', 'Enfermagem?', 'Como foi o médico?', 'No geral?']);
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(body(post[1])).toEqual({ text: 'Como foi o médico?', step: 'MEDICO' });
  });
});
