import type { Pool, PoolClient } from 'pg';
import type { CommentType, Shift } from '@avaliacoes/schemas';
import type {
  NewResponse,
  PublicSurvey,
  ResponsesRepository,
  StoredResponse,
  SurveyQuestion,
} from '../repositories/responses.repository';
import { getPool } from './connection';

// Implementação do ResponsesRepository com SQL puro (biblioteca pg).
// Recebe uma função que devolve o pool, e não o pool pronto: assim a API pode ser montada
// sem conectar no banco (os testes usam um banco em memória no lugar).
export class SupabaseResponsesRepository implements ResponsesRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  // Roda vários comandos numa transação: ou todos dão certo, ou nada muda no banco.
  private async transaction(work: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await this.db().connect();
    try {
      await client.query('BEGIN');
      await work(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // RN02: a pesquisa ativa do setor. Setor inativo ou sem pesquisa ativa = não encontrado.
  private async findSurvey(where: string, value: string): Promise<PublicSurvey | null> {
    const found = await this.db().query<{ sector_id: number; name: string; slug: string; survey_id: number }>(
      `SELECT sectors.id AS sector_id, sectors.name, sectors.slug, surveys.id AS survey_id
       FROM sectors
       JOIN surveys ON surveys.sector_id = sectors.id AND surveys.active
       WHERE ${where} AND sectors.active`,
      [value],
    );
    const row = found.rows[0];
    if (!row) return null;

    // RN02: na ordem cadastrada. RN05: a obrigatória sempre por último.
    const questions = await this.db().query<PublicSurvey['survey']['questions'][number]>(
      `SELECT id, position, text, step, required
       FROM questions
       WHERE survey_id = $1 AND active
       ORDER BY required, position`,
      [row.survey_id],
    );

    return {
      sector: { id: row.sector_id, name: row.name, slug: row.slug },
      survey: { id: row.survey_id, questions: questions.rows },
    };
  }

  findSurveyBySlug(slug: string) {
    return this.findSurvey('sectors.slug = $1', slug);
  }

  findSurveyByCode(code: string) {
    return this.findSurvey('sectors.code = $1', code);
  }

  async findQuestion(surveyId: number, questionId: number): Promise<SurveyQuestion | null> {
    const result = await this.db().query<SurveyQuestion>(
      `SELECT questions.id, questions.survey_id AS "surveyId", surveys.sector_id AS "sectorId", questions.required
       FROM questions
       JOIN surveys ON surveys.id = questions.survey_id AND surveys.active
       JOIN sectors ON sectors.id = surveys.sector_id AND sectors.active
       WHERE questions.survey_id = $1 AND questions.id = $2 AND questions.active`,
      [surveyId, questionId],
    );
    return result.rows[0] ?? null;
  }

  // RN14: a equipe vem da escala (setor + data do plantão + turno).
  async findTeamId(sectorId: number, shiftDate: string, shift: Shift): Promise<number | null> {
    const result = await this.db().query<{ team_id: number }>(
      'SELECT team_id FROM schedules WHERE sector_id = $1 AND shift_date = $2 AND shift = $3',
      [sectorId, shiftDate, shift],
    );
    return result.rows[0]?.team_id ?? null;
  }

  async createResponse(data: NewResponse): Promise<string> {
    let id = '';
    await this.transaction(async (client) => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO responses (sector_id, survey_id, shift_date, shift, team_id, overall_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [data.sectorId, data.surveyId, data.shiftDate, data.shift, data.teamId, data.required ? data.value : null],
      );
      id = created.rows[0].id;
      await client.query('INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, $3)', [
        id,
        data.questionId,
        data.value,
      ]);
    });
    return id;
  }

  async findResponse(id: string): Promise<StoredResponse | null> {
    const result = await this.db().query<StoredResponse>(
      'SELECT id, survey_id AS "surveyId", sector_id AS "sectorId", status FROM responses WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async saveAnswer(responseId: string, questionId: number, value: number, required: boolean): Promise<void> {
    await this.transaction(async (client) => {
      // Tocar de novo na mesma pergunta troca a carinha (uma linha por pergunta).
      await client.query(
        `INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, $3)
         ON CONFLICT (response_id, question_id) DO UPDATE SET value = EXCLUDED.value`,
        [responseId, questionId, value],
      );
      // updated_at marca a última atividade (RN10: 30 min parada vira ABANDONED).
      await client.query(
        `UPDATE responses
         SET updated_at = NOW(), overall_score = CASE WHEN $3 THEN $2 ELSE overall_score END
         WHERE id = $1`,
        [responseId, value, required],
      );
    });
  }

  async hasComment(responseId: string): Promise<boolean> {
    const result = await this.db().query('SELECT 1 FROM comments WHERE response_id = $1', [responseId]);
    return result.rows.length > 0;
  }

  async createComment(responseId: string, type: CommentType | null, text: string): Promise<void> {
    await this.transaction(async (client) => {
      await client.query('INSERT INTO comments (response_id, type, text) VALUES ($1, $2, $3)', [
        responseId,
        type,
        text,
      ]);
      await client.query('UPDATE responses SET updated_at = NOW() WHERE id = $1', [responseId]);
    });
  }

  async hasRequiredAnswer(responseId: string): Promise<boolean> {
    const result = await this.db().query(
      `SELECT 1
       FROM answers
       JOIN questions ON questions.id = answers.question_id AND questions.required
       WHERE answers.response_id = $1`,
      [responseId],
    );
    return result.rows.length > 0;
  }

  async completeResponse(responseId: string): Promise<void> {
    await this.db().query(
      `UPDATE responses
       SET status = 'COMPLETE', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'PARTIAL'`,
      [responseId],
    );
  }

  // A hora vem do banco (NOW()), e não do computador da API, para as duas sempre concordarem.
  // As respostas (answers) não são apagadas: continuam contando nos indicadores (RN10).
  async abandonInactive(minutes: number): Promise<number[]> {
    const result = await this.db().query<{ sector_id: number }>(
      `UPDATE responses
       SET status = 'ABANDONED'
       WHERE status = 'PARTIAL' AND updated_at < NOW() - $1 * INTERVAL '1 minute'
       RETURNING sector_id`,
      [minutes],
    );
    return result.rows.map((row) => row.sector_id);
  }
}
