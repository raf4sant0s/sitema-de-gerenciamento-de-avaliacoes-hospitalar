import type { JourneyStep, Question, Survey } from '@avaliacoes/schemas';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import type { QuestionWithAnswers, SurveysRepository } from '../../database/repositories/surveys.repository';
import { type AuthUser, assertSectorAccess } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// Texto padrão da pergunta obrigatória (RN05), o mesmo dos dados de exemplo. O admin pode editar.
export const DEFAULT_REQUIRED_QUESTION = 'No geral, como você avalia o atendimento do hospital hoje?';

// O que a API devolve (README, seção 9).
export interface SurveyView {
  id: number;
  sectorId: number;
  title: string;
  active: boolean;
  createdAt: string;
}

export interface QuestionView {
  id: number;
  surveyId: number;
  position: number;
  text: string;
  step: JourneyStep;
  required: boolean;
  active: boolean;
  answerCount: number; // quantas respostas já recebeu (a tela avisa antes de mudar o texto)
}

function toSurveyView(survey: Survey): SurveyView {
  return {
    id: survey.id,
    sectorId: survey.sector_id,
    title: survey.title,
    active: survey.active,
    createdAt: survey.created_at.toISOString(),
  };
}

function toQuestionView(question: Question, answerCount: number): QuestionView {
  return {
    id: question.id,
    surveyId: question.survey_id,
    position: question.position,
    text: question.text,
    step: question.step,
    required: question.required,
    active: question.active,
    answerCount,
  };
}

// Regras das pesquisas e perguntas (tarefa B13). Super admin: todos os setores; admin de setor: só o dele (RN16).
// Decisões da dupla:
// - toda pesquisa nasce desativada e já com a pergunta obrigatória, que não pode ser apagada (RN05);
// - ativar uma pesquisa desativa a que estava ativa no mesmo setor (RN02);
// - o texto de uma pergunta já respondida pode ser corrigido (a tela avisa).
export class SurveysService {
  constructor(
    private readonly surveys: SurveysRepository,
    private readonly sectors: SectorsRepository,
  ) {}

  async list(me: AuthUser, sectorId?: number): Promise<SurveyView[]> {
    if (me.role !== 'SUPER_ADMIN') {
      sectorId = me.sectorId!;
    }
    return (await this.surveys.listSurveys(sectorId)).map(toSurveyView);
  }

  async get(me: AuthUser, id: number): Promise<SurveyView> {
    return toSurveyView(await this.findSurvey(me, id));
  }

  async create(me: AuthUser, sectorId: number, title: string): Promise<SurveyView> {
    assertSectorAccess(me, sectorId);
    if (!(await this.sectors.findById(sectorId))) {
      throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
    }
    const survey = await this.surveys.createSurvey({ sectorId, title, requiredQuestionText: DEFAULT_REQUIRED_QUESTION });
    return toSurveyView(survey);
  }

  async update(me: AuthUser, id: number, data: { title?: string; active?: boolean }): Promise<SurveyView> {
    await this.findSurvey(me, id);

    let survey: Survey | null = null;
    if (data.title !== undefined) survey = await this.surveys.updateSurveyTitle(id, data.title);
    if (data.active === true) survey = await this.surveys.activateSurvey(id);
    if (data.active === false) survey = await this.surveys.deactivateSurvey(id);

    return toSurveyView(survey ?? (await this.surveys.findSurvey(id))!);
  }

  async listQuestions(me: AuthUser, surveyId: number): Promise<QuestionView[]> {
    await this.findSurvey(me, surveyId);
    return (await this.surveys.listQuestions(surveyId)).map((question) => toQuestionView(question, question.answer_count));
  }

  async createQuestion(me: AuthUser, surveyId: number, data: { text: string; step: JourneyStep }): Promise<QuestionView> {
    await this.findSurvey(me, surveyId);
    // Só perguntas opcionais são criadas aqui: a obrigatória já nasce com a pesquisa (RN05).
    return toQuestionView(await this.surveys.createQuestion(surveyId, data), 0);
  }

  async updateQuestion(
    me: AuthUser,
    id: number,
    data: { text?: string; step?: JourneyStep; active?: boolean },
  ): Promise<QuestionView> {
    const question = await this.findQuestion(me, id);

    // A obrigatória só tem o texto editável: não muda de etapa nem é desativada (RN05).
    if (question.required && (data.active === false || (data.step !== undefined && data.step !== question.step))) {
      throw new AppError(400, 'REQUIRED_QUESTION_LOCKED', 'A pergunta obrigatória não pode ser desativada nem mudar de etapa');
    }

    const updated = await this.surveys.updateQuestion(id, data);
    return toQuestionView(updated!, question.answer_count);
  }

  // "Apagar" uma pergunta = desativar: as respostas antigas continuam guardadas (README, seção 9).
  async deactivateQuestion(me: AuthUser, id: number): Promise<QuestionView> {
    return this.updateQuestion(me, id, { active: false });
  }

  // RN02: a ordem das perguntas opcionais. A lista precisa ter TODAS as opcionais da pesquisa, uma vez cada.
  // A obrigatória não entra: ela é sempre a última (RN05).
  async reorder(me: AuthUser, surveyId: number, ids: number[]): Promise<QuestionView[]> {
    await this.findSurvey(me, surveyId);
    const optional = (await this.surveys.listQuestions(surveyId)).filter((question) => !question.required);
    const expected = optional.map((question) => question.id).sort((a, b) => a - b);
    const received = [...ids].sort((a, b) => a - b);

    if (expected.length !== received.length || expected.some((id, index) => id !== received[index])) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Envie todas as perguntas opcionais da pesquisa, cada uma uma vez');
    }

    await this.surveys.reorderQuestions(surveyId, ids);
    return this.listQuestions(me, surveyId);
  }

  private async findSurvey(me: AuthUser, id: number): Promise<Survey> {
    const survey = await this.surveys.findSurvey(id);
    if (!survey) throw new AppError(404, 'SURVEY_NOT_FOUND', 'Pesquisa não encontrada');
    assertSectorAccess(me, survey.sector_id);
    return survey;
  }

  private async findQuestion(me: AuthUser, id: number): Promise<QuestionWithAnswers> {
    const question = await this.surveys.findQuestion(id);
    if (!question) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada');
    await this.findSurvey(me, question.survey_id);
    return question;
  }
}
