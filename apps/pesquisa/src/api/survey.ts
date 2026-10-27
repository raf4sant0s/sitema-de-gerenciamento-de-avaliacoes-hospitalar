import { api } from './client';

// Chamadas às rotas públicas da pesquisa (README, seção 9). Nenhuma envia dado pessoal (RN08).

export type JourneyStep = 'GERAL' | 'RECEPCAO' | 'TRIAGEM' | 'ENFERMAGEM' | 'MEDICO';
export type CommentType = 'ELOGIO' | 'RECLAMACAO' | 'SUGESTAO';

export interface SurveyQuestion {
  id: number;
  position: number;
  text: string;
  step: JourneyStep;
  required: boolean;
}

export interface PublicSurvey {
  sector: { id: number; name: string; slug: string };
  survey: { id: number; questions: SurveyQuestion[] };
}

function send(method: 'POST' | 'PUT', body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

// RN01: pelo link do setor (/avaliacao/pronto-atendimento)
export function getSurveyBySlug(slug: string) {
  return api<PublicSurvey>(`/public/sectors/${encodeURIComponent(slug)}`);
}

// RN09: o primeiro toque cria a resposta e devolve o id dela
export async function startResponse(data: { sectorId: number; surveyId: number; questionId: number; value: number }) {
  const { id } = await api<{ id: string }>('/public/responses', send('POST', data));
  return id;
}

// RN09: cada toque seguinte é salvo na hora
export function saveAnswer(responseId: string, questionId: number, value: number) {
  return api<{ ok: true }>(`/public/responses/${responseId}/answers/${questionId}`, send('PUT', { value }));
}

// RN11: comentário anônimo, com tipo opcional
export function sendComment(responseId: string, comment: { type: CommentType | null; text: string }) {
  return api<{ ok: true }>(`/public/responses/${responseId}/comment`, send('POST', comment));
}

// RN10: ao chegar no agradecimento, a resposta vira COMPLETE
export function completeResponse(responseId: string) {
  return api<{ ok: true }>(`/public/responses/${responseId}/complete`, send('POST'));
}
