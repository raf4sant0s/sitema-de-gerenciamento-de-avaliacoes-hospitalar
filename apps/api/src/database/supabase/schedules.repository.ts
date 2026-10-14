import { type Schedule, scheduleSchema, type Team, teamSchema } from '@avaliacoes/schemas';
import type { Pool } from 'pg';
import type { ScheduleItem, SchedulesRepository } from '../repositories/schedules.repository';
import { getPool } from './connection';

const teamColumns = 'id, sector_id, name, active';
const scheduleColumns = 'id, sector_id, shift_date, shift, team_id';

// Implementação do SchedulesRepository com SQL puro no PostgreSQL do Supabase.
// Recebe uma função que devolve o banco: a API usa o Supabase; os testes, um PostgreSQL em memória (PGlite).
export class SupabaseSchedulesRepository implements SchedulesRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  async listTeams(sectorId?: number): Promise<Team[]> {
    const result =
      sectorId === undefined
        ? await this.db().query(`SELECT ${teamColumns} FROM teams ORDER BY name, id`)
        : await this.db().query(`SELECT ${teamColumns} FROM teams WHERE sector_id = $1 ORDER BY name, id`, [sectorId]);
    return result.rows.map((row) => teamSchema.parse(row));
  }

  async findTeam(id: number): Promise<Team | null> {
    const result = await this.db().query(`SELECT ${teamColumns} FROM teams WHERE id = $1`, [id]);
    return result.rows[0] ? teamSchema.parse(result.rows[0]) : null;
  }

  async createTeam(data: { sectorId: number; name: string }): Promise<Team> {
    const result = await this.db().query(`INSERT INTO teams (sector_id, name) VALUES ($1, $2) RETURNING ${teamColumns}`, [
      data.sectorId,
      data.name,
    ]);
    return teamSchema.parse(result.rows[0]);
  }

  async updateTeam(id: number, data: { name?: string; active?: boolean }): Promise<Team | null> {
    // COALESCE: se o campo não veio, mantém o valor que já estava no banco.
    const result = await this.db().query(
      `UPDATE teams SET name = COALESCE($2, name), active = COALESCE($3, active) WHERE id = $1 RETURNING ${teamColumns}`,
      [id, data.name ?? null, data.active ?? null],
    );
    return result.rows[0] ? teamSchema.parse(result.rows[0]) : null;
  }

  async listSchedules(sectorId: number, from: string, to: string): Promise<Schedule[]> {
    const result = await this.db().query(
      `SELECT ${scheduleColumns} FROM schedules
       WHERE sector_id = $1 AND shift_date BETWEEN $2 AND $3
       ORDER BY shift_date, CASE shift WHEN 'MANHA' THEN 1 WHEN 'TARDE' THEN 2 ELSE 3 END`,
      [sectorId, from, to],
    );
    // shift_date chega como texto AAAA-MM-DD (connection.ts); o PGlite dos testes devolve data, então normaliza.
    return result.rows.map((row) => scheduleSchema.parse({ ...row, shift_date: toDateText(row.shift_date) }));
  }

  async saveSchedules(items: ScheduleItem[]): Promise<{ responsesUpdated: number }> {
    const client = await this.db().connect();
    let responsesUpdated = 0;
    try {
      await client.query('BEGIN');
      for (const item of items) {
        if (item.teamId === null) {
          await client.query('DELETE FROM schedules WHERE sector_id = $1 AND shift_date = $2 AND shift = $3', [
            item.sectorId,
            item.shiftDate,
            item.shift,
          ]);
        } else {
          // Se já existe escala nessa célula, troca a equipe; se não existe, cria.
          await client.query(
            `INSERT INTO schedules (sector_id, shift_date, shift, team_id) VALUES ($1, $2, $3, $4)
             ON CONFLICT (sector_id, shift_date, shift) DO UPDATE SET team_id = EXCLUDED.team_id`,
            [item.sectorId, item.shiftDate, item.shift, item.teamId],
          );
        }
        // Decisão da dupla: as respostas daquele setor, dia e turno passam para a equipe da escala (RN14).
        const updated = await client.query(
          `UPDATE responses SET team_id = $4
           WHERE sector_id = $1 AND shift_date = $2 AND shift = $3 AND team_id IS DISTINCT FROM $4`,
          [item.sectorId, item.shiftDate, item.shift, item.teamId],
        );
        responsesUpdated += updated.rowCount ?? 0;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { responsesUpdated };
  }
}

function toDateText(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}
