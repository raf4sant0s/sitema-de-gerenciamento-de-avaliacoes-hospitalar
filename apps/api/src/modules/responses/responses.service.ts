import type { CommentType } from '@avaliacoes/schemas';
import type { PublicSurvey, ResponsesRepository } from '../../database/repositories/responses.repository';
import { AppError } from '../../shared/errors';
import { getShift } from '../../shared/shift';

// Regras da pesquisa do paciente. Usa só a interface do repositório, nunca o banco direto.
// "now" pode ser trocado nos testes; na API é sempre a hora atual.
export class ResponsesService {
  constructor(
    private readonly repository: ResponsesRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // RN01: pelo link do setor. Setor inativo ou sem pesquisa ativa → 404 (README, seção 9).
  async getSurveyBySlug(slug: string): Promise<PublicSurvey> {
    return this.orNotFound(await this.repository.findSurveyBySlug(slug));
  }

  // RN01: pelo código curto. Aceita minúsculas, porque quem digita o código pode não usar maiúsculas.
  async getSurveyByCode(code: string): Promise<PublicSurvey> {
    return this.orNotFound(await this.repository.findSurveyByCode(code.toUpperCase()));
  }

  // RN09: a resposta nasce no primeiro toque, já com turno, data do plantão (RN13) e equipe (RN14).
  async createResponse(input: { sectorId: number; surveyId: number; questionId: number; value: number }): Promise<string> {
    const question = await this.repository.findQuestion(input.surveyId, input.questionId);
    if (!question || question.sectorId !== input.sectorId) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada nesta pesquisa');
    }

    const { shift, shiftDate } = getShift(this.now());
    const teamId = await this.repository.findTeamId(input.sectorId, shiftDate, shift);

    return this.repository.createResponse({
      sectorId: input.sectorId,
      surveyId: input.surveyId,
      shiftDate,
      shift,
      teamId,
      questionId: question.id,
      value: input.value,
      required: question.required,
    });
  }

  // RN09: cada toque seguinte é salvo na hora.
  async saveAnswer(responseId: string, questionId: number, value: number): Promise<void> {
    const response = await this.getOpenResponse(responseId);

    const question = await this.repository.findQuestion(response.surveyId, questionId);
    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada nesta pesquisa');
    }

    await this.repository.saveAnswer(responseId, questionId, value, question.required);
  }

  // RN11: comentário anônimo opcional, com tipo opcional. Um por resposta.
  async addComment(responseId: string, type: CommentType | null, text: string): Promise<void> {
    await this.getOpenResponse(responseId);

    if (await this.repository.hasComment(responseId)) {
      throw new AppError(409, 'COMMENT_ALREADY_SENT', 'Esta resposta já tem um comentário');
    }

    await this.repository.createComment(responseId, type, text);
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
