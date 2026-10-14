import type { JourneyStep, Question, Survey } from '@avaliacoes/schemas';

// Pergunta com a quantidade de respostas que já recebeu (para avisar ao editar o texto).
export type QuestionWithAnswers = Question & { answer_count: number };

// Contrato de acesso às pesquisas e perguntas: O QUE dá para fazer, sem dizer qual banco é.
// A implementação com o Supabase está em ../supabase/surveys.repository.ts.
export interface SurveysRepository {
  // Pesquisas mais novas primeiro. Com sectorId, só as daquele setor.
  listSurveys(sectorId?: number): Promise<Survey[]>;
  findSurvey(id: number): Promise<Survey | null>;
  // Cria a pesquisa DESATIVADA, já com a pergunta obrigatória (RN05), tudo numa transação.
  createSurvey(data: { sectorId: number; title: string; requiredQuestionText: string }): Promise<Survey>;
  updateSurveyTitle(id: number, title: string): Promise<Survey | null>;
  // RN02: ativa esta e desativa a que estava ativa no mesmo setor, numa transação.
  activateSurvey(id: number): Promise<Survey | null>;
  deactivateSurvey(id: number): Promise<Survey | null>;

  // Todas as perguntas da pesquisa (ativas e inativas): opcionais pela posição, obrigatória por último.
  listQuestions(surveyId: number): Promise<QuestionWithAnswers[]>;
  findQuestion(id: number): Promise<QuestionWithAnswers | null>;
  // Nova pergunta opcional, no fim da lista de opcionais.
  createQuestion(surveyId: number, data: { text: string; step: JourneyStep }): Promise<Question>;
  updateQuestion(id: number, data: { text?: string; step?: JourneyStep; active?: boolean }): Promise<Question | null>;
  // Grava a nova ordem das perguntas opcionais (posição 1, 2, 3...), numa transação.
  reorderQuestions(surveyId: number, orderedIds: number[]): Promise<void>;
}
