import { type JourneyStep, type Question, questionSchema, type Survey, surveySchema } from '@avaliacoes/schemas';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { QuestionWithAnswers, SurveysRepository } from '../repositories/surveys.repository';
import { getPool } from './connection';

const surveyColumns = 'id, sector_id, title, active, created_at';
const questionColumns = 'id, survey_id, position, text, step, required, active';

const questionWithAnswersSchema = questionSchema.extend({ answer_count: z.coerce.number().int() });

// Implementação do SurveysRepository com SQL puro no PostgreSQL do Supabase.
// Recebe uma função que devolve o banco (igual ao repositório de respostas): a API usa o Supabase,
// e os testes passam um PostgreSQL em memória (PGlite).
export class SupabaseSurveysRepository implements SurveysRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  // Roda vários comandos numa transação: ou todos dão certo, ou nada muda no banco.
  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listSurveys(sectorId?: number): Promise<Survey[]> {
    const result =
      sectorId === undefined
        ? await this.db().query(`SELECT ${surveyColumns} FROM surveys ORDER BY created_at DESC, id DESC`)
        : await this.db().query(`SELECT ${surveyColumns} FROM surveys WHERE sector_id = $1 ORDER BY created_at DESC, id DESC`, [
            sectorId,
          ]);
    return result.rows.map((row) => surveySchema.parse(row));
  }

  async findSurvey(id: number): Promise<Survey | null> {
    const result = await this.db().query(`SELECT ${surveyColumns} FROM surveys WHERE id = $1`, [id]);
    return result.rows[0] ? surveySchema.parse(result.rows[0]) : null;
  }

  async createSurvey(data: { sectorId: number; title: string; requiredQuestionText: string }): Promise<Survey> {
    return this.transaction(async (client) => {
      const survey = await client.query(
        `INSERT INTO surveys (sector_id, title, active) VALUES ($1, $2, FALSE) RETURNING ${surveyColumns}`,
        [data.sectorId, data.title],
      );
      // RN05: toda pesquisa nasce com a pergunta obrigatória (avaliação geral), etapa GERAL.
      await client.query(`INSERT INTO questions (survey_id, position, text, step, required) VALUES ($1, 1, $2, 'GERAL', TRUE)`, [
        survey.rows[0].id,
        data.requiredQuestionText,
      ]);
      return surveySchema.parse(survey.rows[0]);
    });
  }

  async updateSurveyTitle(id: number, title: string): Promise<Survey | null> {
    const result = await this.db().query(`UPDATE surveys SET title = $2 WHERE id = $1 RETURNING ${surveyColumns}`, [id, title]);
    return result.rows[0] ? surveySchema.parse(result.rows[0]) : null;
  }

  async activateSurvey(id: number): Promise<Survey | null> {
    return this.transaction(async (client) => {
      const found = await client.query(`SELECT sector_id FROM surveys WHERE id = $1`, [id]);
      if (!found.rows[0]) return null;
      // RN02: primeiro desativa a que estava ativa no setor; depois ativa esta.
      await client.query(`UPDATE surveys SET active = FALSE WHERE sector_id = $1 AND active AND id <> $2`, [
        found.rows[0].sector_id,
        id,
      ]);
      const result = await client.query(`UPDATE surveys SET active = TRUE WHERE id = $1 RETURNING ${surveyColumns}`, [id]);
      return surveySchema.parse(result.rows[0]);
    });
  }

  async deactivateSurvey(id: number): Promise<Survey | null> {
    const result = await this.db().query(`UPDATE surveys SET active = FALSE WHERE id = $1 RETURNING ${surveyColumns}`, [id]);
    return result.rows[0] ? surveySchema.parse(result.rows[0]) : null;
  }

  async listQuestions(surveyId: number): Promise<QuestionWithAnswers[]> {
    const result = await this.db().query(
      `SELECT ${questionColumns.split(', ').map((column) => `questions.${column}`).join(', ')},
              (SELECT COUNT(*) FROM answers WHERE answers.question_id = questions.id) AS answer_count
       FROM questions
       WHERE survey_id = $1
       ORDER BY required, position, id`,
      [surveyId],
    );
    return result.rows.map((row) => questionWithAnswersSchema.parse(row));
  }

  async findQuestion(id: number): Promise<QuestionWithAnswers | null> {
    const result = await this.db().query(
      `SELECT ${questionColumns},
              (SELECT COUNT(*) FROM answers WHERE answers.question_id = questions.id) AS answer_count
       FROM questions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? questionWithAnswersSchema.parse(result.rows[0]) : null;
  }

  async createQuestion(surveyId: number, data: { text: string; step: JourneyStep }): Promise<Question> {
    const result = await this.db().query(
      `INSERT INTO questions (survey_id, position, text, step, required)
       VALUES ($1, (SELECT COALESCE(MAX(position), 0) + 1 FROM questions WHERE survey_id = $1 AND NOT required), $2, $3, FALSE)
       RETURNING ${questionColumns}`,
      [surveyId, data.text, data.step],
    );
    return questionSchema.parse(result.rows[0]);
  }

  async updateQuestion(id: number, data: { text?: string; step?: JourneyStep; active?: boolean }): Promise<Question | null> {
    // COALESCE: se o campo não veio, mantém o valor que já estava no banco.
    const result = await this.db().query(
      `UPDATE questions SET text = COALESCE($2, text), step = COALESCE($3, step), active = COALESCE($4, active)
       WHERE id = $1 RETURNING ${questionColumns}`,
      [id, data.text ?? null, data.step ?? null, data.active ?? null],
    );
    return result.rows[0] ? questionSchema.parse(result.rows[0]) : null;
  }

  async reorderQuestions(surveyId: number, orderedIds: number[]): Promise<void> {
    await this.transaction(async (client) => {
      for (const [index, id] of orderedIds.entries()) {
        await client.query(`UPDATE questions SET position = $3 WHERE id = $1 AND survey_id = $2`, [id, surveyId, index + 1]);
      }
    });
  }
}
