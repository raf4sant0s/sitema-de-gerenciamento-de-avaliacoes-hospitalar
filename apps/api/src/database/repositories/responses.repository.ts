import type { CommentType, JourneyStep, ResponseStatus, Shift } from '@avaliacoes/schemas';

// O que o módulo responses (pesquisa do paciente) pode fazer com os dados.
// Esta interface não sabe qual é o banco: a implementação fica em database/supabase/ (RNF01).

// O que o site da pesquisa recebe (README, seção 9). Nada além do necessário para mostrar as telas.
export interface PublicSurvey {
  sector: { id: number; name: string; slug: string };
  survey: {
    id: number;
    questions: { id: number; position: number; text: string; step: JourneyStep; required: boolean }[];
  };
}

// Uma pergunta ativa de uma pesquisa ativa, num setor ativo.
export interface SurveyQuestion {
  id: number;
  surveyId: number;
  sectorId: number;
  required: boolean;
}

export interface StoredResponse {
  id: string;
  surveyId: number;
  sectorId: number;
  status: ResponseStatus;
}

export interface NewResponse {
  sectorId: number;
  surveyId: number;
  shiftDate: string; // AAAA-MM-DD
  shift: Shift;
  teamId: number | null;
  // o primeiro toque, que cria a resposta (RN09)
  questionId: number;
  value: number;
  required: boolean;
}

export interface ResponsesRepository {
  findSurveyBySlug(slug: string): Promise<PublicSurvey | null>;
  findQuestion(surveyId: number, questionId: number): Promise<SurveyQuestion | null>;
  findTeamId(sectorId: number, shiftDate: string, shift: Shift): Promise<number | null>;

  // Cria a resposta e grava o primeiro toque juntos. Devolve o id da resposta.
  createResponse(data: NewResponse): Promise<string>;
  findResponse(id: string): Promise<StoredResponse | null>;
  // Grava (ou troca) a carinha de uma pergunta. Se for a obrigatória, copia a nota para overall_score.
  saveAnswer(responseId: string, questionId: number, value: number, required: boolean): Promise<void>;

  hasComment(responseId: string): Promise<boolean>;
  createComment(responseId: string, type: CommentType | null, text: string): Promise<void>;

  hasRequiredAnswer(responseId: string): Promise<boolean>;
  completeResponse(responseId: string): Promise<void>;

  // RN10: muda para ABANDONED as respostas PARTIAL sem atividade há mais de "minutes" minutos.
  // Devolve o setor de cada resposta que mudou (para avisar o dashboard, A15).
  abandonInactive(minutes: number): Promise<number[]>;
}
