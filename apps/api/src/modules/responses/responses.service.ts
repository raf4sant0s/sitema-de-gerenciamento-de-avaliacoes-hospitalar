import type { CommentType } from '@avaliacoes/schemas';
import type { PublicSurvey, ResponsesRepository } from '../../database/repositories/responses.repository';
import { AppError } from '../../shared/errors';
import { type Notifier, realtime } from '../../shared/realtime';
import { getShift } from '../../shared/shift';

// RN10: resposta PARTIAL sem atividade por 30 minutos vira ABANDONED.
export const ABANDON_AFTER_MINUTES = 30;

// Regras da pesquisa do paciente. Usa só a interface do repositório, nunca o banco direto.
// "now" e "notifier" podem ser trocados nos testes; na API são a hora atual e o tempo real (A15).
export class ResponsesService {
  constructor(
    private readonly repository: ResponsesRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly notifier: Notifier = realtime,
  ) {}

  // RN01: pelo link do setor (/avaliacao/<slug>). Setor inativo ou sem pesquisa ativa → 404 (README, seção 9).
  async getSurveyBySlug(slug: string): Promise<PublicSurvey> {
    return this.orNotFound(await this.repository.findSurveyBySlug(slug));
  }

  // RN09: a resposta nasce no primeiro toque, já com turno, data do plantão (RN13) e equipe (RN14).
  async createResponse(input: { sectorId: number; surveyId: number; questionId: number; value: number }): Promise<string> {
    const question = await this.repository.findQuestion(input.surveyId, input.questionId);
    if (!question || question.sectorId !== input.sectorId) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada nesta pesquisa');
    }

    const { shift, shiftDate } = getShift(this.now());
    const teamId = await this.repository.findTeamId(input.sectorId, shiftDate, shift);

    const id = await this.repository.createResponse({
      sectorId: input.sectorId,
      surveyId: input.surveyId,
      shiftDate,
      shift,
      teamId,
      questionId: question.id,
      value: input.value,
      required: question.required,
    });
    this.notifier.notify('response:changed', input.sectorId); // A15: o dashboard atualiza sozinho
    return id;
  }

  // RN09: cada toque seguinte é salvo na hora.
  async saveAnswer(responseId: string, questionId: number, value: number): Promise<void> {
    const response = await this.getOpenResponse(responseId);

    const question = await this.repository.findQuestion(response.surveyId, questionId);
    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada nesta pesquisa');
    }

    await this.repository.saveAnswer(responseId, questionId, value, question.required);
    this.notifier.notify('response:changed', response.sectorId);
  }

  // RN11: comentário anônimo opcional, com tipo opcional. Um por resposta.
  async addComment(responseId: string, type: CommentType | null, text: string): Promise<void> {
    const response = await this.getOpenResponse(responseId);

    if (await this.repository.hasComment(responseId)) {
      throw new AppError(409, 'COMMENT_ALREADY_SENT', 'Esta resposta já tem um comentário');
    }

    await this.repository.createComment(responseId, type, text);
    this.notifier.notify('comment:created', response.sectorId);
  }

  // RN05 e RN10: só termina se a pergunta obrigatória foi respondida.
  async complete(responseId: string): Promise<void> {
    const response = await this.findResponse(responseId);

    // Tocar duas vezes em "terminar" não é erro.
    if (response.status === 'COMPLETE') return;
    if (response.status !== 'PARTIAL') {
      throw new AppError(409, 'RESPONSE_CLOSED', 'Esta resposta não pode mais ser alterada');
    }

    if (!(await this.repository.hasRequiredAnswer(responseId))) {
      throw new AppError(400, 'REQUIRED_MISSING', 'A pergunta obrigatória não foi respondida');
    }

    await this.repository.completeResponse(responseId);
    this.notifier.notify('response:changed', response.sectorId);
  }

  // RN10: chamado pela rotina de abandono (abandonment.ts). Devolve quantas respostas mudaram.
  async abandonInactive(): Promise<number> {
    const sectorIds = await this.repository.abandonInactive(ABANDON_AFTER_MINUTES);
    // Um aviso por setor que teve respostas abandonadas (o total de abandonadas mudou).
    for (const sectorId of new Set(sectorIds)) {
      this.notifier.notify('response:changed', sectorId);
    }
    return sectorIds.length;
  }

  private orNotFound(survey: PublicSurvey | null): PublicSurvey {
    if (!survey) {
      throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
    }
    return survey;
  }

  private async findResponse(responseId: string) {
    const response = await this.repository.findResponse(responseId);
    if (!response) {
      throw new AppError(404, 'RESPONSE_NOT_FOUND', 'Resposta não encontrada');
    }
    return response;
  }

  // Só dá para mudar uma resposta que ainda está em andamento (README, seção 9: 409 se não estiver PARTIAL).
  private async getOpenResponse(responseId: string) {
    const response = await this.findResponse(responseId);
    if (response.status !== 'PARTIAL') {
      throw new AppError(409, 'RESPONSE_CLOSED', 'Esta resposta não pode mais ser alterada');
    }
    return response;
  }
}
