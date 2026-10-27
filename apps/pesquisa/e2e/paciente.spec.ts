import { expect, type Page, test } from '@playwright/test';

// Testes E2E do paciente (tarefa A18): um navegador de verdade faz o caminho da pesquisa,
// falando com uma API de teste de verdade (banco em memória). Ver playwright.config.ts.

const API = 'http://localhost:3399';

interface SavedResponse {
  id: string;
  status: 'PARTIAL' | 'COMPLETE' | 'ABANDONED';
  overallScore: number | null;
  answers: number;
  commentType: string | null;
  commentText: string | null;
}

// O que a API de teste gravou (rota que só existe na API de teste).
async function savedResponses(page: Page): Promise<SavedResponse[]> {
  const res = await page.request.get(`${API}/e2e/responses`);
  return res.json();
}

async function lastResponse(page: Page) {
  const all = await savedResponses(page);
  return all[all.length - 1];
}

// Toca numa carinha e espera a próxima tela (ela avança sozinha, D7).
async function tapFace(page: Page, face: string, nextQuestion: string) {
  await page.getByRole('button', { name: face, exact: true }).click();
  await expect(page.getByRole('heading', { name: nextQuestion })).toBeVisible();
}

test('paciente responde tudo: carinhas, "pular", obrigatória por último, comentário e agradecimento', async ({ page }) => {
  await page.goto('/avaliacao/pronto-atendimento');

  await expect(page.getByRole('heading', { name: 'Como foi o atendimento na recepção?' })).toBeVisible();
  // RN03: nenhuma tela mostra contador ou progresso
  await expect(page.locator('body')).not.toContainText(/\d+\s*(de|\/)\s*\d+/);

  await tapFace(page, 'Ruim', 'Como foi a triagem?');
  await page.getByRole('button', { name: 'pular' }).click(); // RN07
  await expect(page.getByRole('heading', { name: 'Como foi o atendimento da enfermagem?' })).toBeVisible();
  await tapFace(page, 'Bom', 'Como foi o atendimento do médico?');
  await tapFace(page, 'Ótimo', 'No geral, como você avalia o atendimento do hospital hoje?');

  // RN05: a obrigatória é a última e não tem "pular"
  await expect(page.getByText('Avaliação geral')).toBeVisible();
  await expect(page.getByRole('button', { name: 'pular' })).toHaveCount(0);
  await tapFace(page, 'Regular', 'Quer contar mais alguma coisa?');

  // RN11: comentário com tipo; RN08: nenhum campo de dado pessoal
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reclamação' }).click();
  await page.getByLabel('Seu comentário:').fill('Esperei muito na recepção.');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByRole('heading', { name: 'Obrigado!' })).toBeVisible();

  // No banco: COMPLETE, nota geral 3 (Regular), 4 carinhas (a triagem foi pulada) e o comentário
  expect(await lastResponse(page)).toMatchObject({
    status: 'COMPLETE',
    overallScore: 3,
    answers: 4,
    commentType: 'RECLAMACAO',
    commentText: 'Esperei muito na recepção.',
  });
});

test('paciente fecha no meio: o que já respondeu fica salvo (RN09)', async ({ page, context }) => {
  const before = (await savedResponses(page)).length;

  await page.goto('/avaliacao/pronto-atendimento'); // o link do QR Code (RN01)
  await tapFace(page, 'Bom', 'Como foi a triagem?');
  await tapFace(page, 'Ótimo', 'Como foi o atendimento da enfermagem?');

  // "Fecha o navegador" no meio da pesquisa
  await page.close();

  const checker = await context.newPage();
  const all = await savedResponses(checker);
  expect(all.length).toBe(before + 1);
  expect(all[all.length - 1]).toMatchObject({ status: 'PARTIAL', overallScore: null, answers: 2 });
});

test('não dá para terminar sem a pergunta obrigatória (RN05)', async ({ page }) => {
  // Pela tela: pulando tudo o que dá, a última pergunta não tem "pular" e o comentário não aparece
  await page.goto('/avaliacao/raio-x');
  await expect(page.getByRole('heading', { name: 'Como foi o atendimento na recepção?' })).toBeVisible();
  await page.getByRole('button', { name: 'pular' }).click();
  await expect(page.getByRole('heading', { name: 'No geral, como você avalia o atendimento do hospital hoje?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'pular' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Quer contar mais alguma coisa?' })).toHaveCount(0);

  // Pela API, tentando "por fora": responde só uma opcional e pede para terminar → 400 REQUIRED_MISSING
  const survey = await (await page.request.get(`${API}/api/public/sectors/pronto-atendimento`)).json();
  const optional = survey.survey.questions.find((q: { required: boolean }) => !q.required);
  const created = await page.request.post(`${API}/api/public/responses`, {
    data: { sectorId: survey.sector.id, surveyId: survey.survey.id, questionId: optional.id, value: 4 },
  });
  const { id } = await created.json();

  const complete = await page.request.post(`${API}/api/public/responses/${id}/complete`);
  expect(complete.status()).toBe(400);
  expect((await complete.json()).error.code).toBe('REQUIRED_MISSING');
});
