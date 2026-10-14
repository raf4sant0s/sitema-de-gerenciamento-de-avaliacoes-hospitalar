import type { JourneyStep } from '@avaliacoes/schemas';
import { api } from './client';

// Chamadas de pesquisas e perguntas para a API (README, seção 9; tarefa B13).

export interface Survey {
  id: number;
  sectorId: number;
  title: string;
  active: boolean;
  createdAt: string;
}

export interface Question {
  id: number;
  surveyId: number;
  position: number;
  text: string;
  step: JourneyStep;
  required: boolean;
  active: boolean;
  answerCount: number;
}

// Nome das etapas da jornada para mostrar na tela (RN06).
export const stepLabels: Record<JourneyStep, string> = {
  GERAL: 'Geral',
  RECEPCAO: 'Recepção',
  TRIAGEM: 'Triagem',
  ENFERMAGEM: 'Enfermagem',
  MEDICO: 'Médico',
};

export function listSurveys(): Promise<Survey[]> {
  return api<Survey[]>('/surveys');
}

export function getSurvey(id: number): Promise<Survey> {
  return api<Survey>(`/surveys/${id}`);
}

export function createSurvey(sectorId: number, title: string): Promise<Survey> {
  return api<Survey>('/surveys', { method: 'POST', body: JSON.stringify({ sectorId, title }) });
}

export function updateSurvey(id: number, data: { title?: string; active?: boolean }): Promise<Survey> {
  return api<Survey>(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function listQuestions(surveyId: number): Promise<Question[]> {
  return api<Question[]>(`/surveys/${surveyId}/questions`);
}

export function createQuestion(surveyId: number, text: string, step: JourneyStep): Promise<Question> {
  return api<Question>(`/surveys/${surveyId}/questions`, { method: 'POST', body: JSON.stringify({ text, step }) });
}

export function updateQuestion(id: number, data: { text?: string; step?: JourneyStep; active?: boolean }): Promise<Question> {
  return api<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// Nova ordem das perguntas opcionais (todas, uma vez cada). Devolve a lista já reordenada.
export function reorderQuestions(surveyId: number, ids: number[]): Promise<Question[]> {
  return api<Question[]>(`/surveys/${surveyId}/questions/order`, { method: 'PUT', body: JSON.stringify({ ids }) });
}
