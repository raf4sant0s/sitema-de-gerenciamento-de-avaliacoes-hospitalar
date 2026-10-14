import type { Pool } from 'pg';
import type {
  BreakdownBy,
  BreakdownRow,
  DashboardFilters,
  DashboardRepository,
  DashboardSummary,
  QuestionIndicator,
  StepIndicator,
  TimelinePoint,
} from '../repositories/dashboard.repository';
import { getPool } from './connection';

// Implementação do DashboardRepository com SQL puro (biblioteca pg).
// Todas as contas são feitas pelo banco (AVG, COUNT), que é muito mais rápido do que trazer
// todas as respostas para a API.
//
// Médias: ROUND(AVG(...), 1) = 1 casa decimal (RN20, RN21). O pg devolve números decimais como
// texto, por isso o Number(...) ao montar cada resultado.

// Monta o WHERE com os filtros, sempre com parâmetros ($1, $2...), nunca colando o valor no SQL.
function buildWhere(filters: DashboardFilters, extra: string[] = []) {
  const conditions = [...extra];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.from) add('r.shift_date >= ?', filters.from);
  if (filters.to) add('r.shift_date <= ?', filters.to);
  if (filters.sectorId !== undefined) add('r.sector_id = ?', filters.sectorId);
  if (filters.shift) add('r.shift = ?', filters.shift);
  if (filters.teamId !== undefined) add('r.team_id = ?', filters.teamId);

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

const average = (value: string | number | null) => (value === null ? null : Number(value));

export class SupabaseDashboardRepository implements DashboardRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  // RN20: nota geral (média da obrigatória) e quantas respostas em cada carinha.
  // RN10: parciais e abandonadas entram no total, mas não têm nota geral.
  async summary(filters: DashboardFilters): Promise<DashboardSummary> {
    const { where, params } = buildWhere(filters);
    const result = await this.db().query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE r.status = 'COMPLETE')::int AS complete,
         COUNT(*) FILTER (WHERE r.status = 'PARTIAL')::int AS partial,
         COUNT(*) FILTER (WHERE r.status = 'ABANDONED')::int AS abandoned,
         ROUND(AVG(r.overall_score)::numeric, 1) AS overall_average,
         COUNT(*) FILTER (WHERE r.overall_score = 1)::int AS d1,
         COUNT(*) FILTER (WHERE r.overall_score = 2)::int AS d2,
         COUNT(*) FILTER (WHERE r.overall_score = 3)::int AS d3,
         COUNT(*) FILTER (WHERE r.overall_score = 4)::int AS d4,
         COUNT(*) FILTER (WHERE r.overall_score = 5)::int AS d5
       FROM responses r
       ${where}`,
      params,
    );
    const row = result.rows[0];
    return {
      overallAverage: average(row.overall_average),
      totalResponses: row.total,
      complete: row.complete,
      partial: row.partial,
      abandoned: row.abandoned,
      distribution: { 1: row.d1, 2: row.d2, 3: row.d3, 4: row.d4, 5: row.d5 },
    };
  }

  // RN21: média de cada pergunta. Perguntas puladas não têm linha em answers, então não entram.
  async questions(filters: DashboardFilters): Promise<QuestionIndicator[]> {
    const { where, params } = buildWhere(filters);
    const result = await this.db().query(
      `SELECT q.id AS question_id, q.text, q.step,
              ROUND(AVG(a.value)::numeric, 1) AS average, COUNT(*)::int AS count
       FROM answers a
       JOIN responses r ON r.id = a.response_id
       JOIN questions q ON q.id = a.question_id
       JOIN surveys s ON s.id = q.survey_id
       ${where}
       GROUP BY q.id, q.text, q.step, s.sector_id, q.required, q.position
       ORDER BY s.sector_id, q.required, q.position`,
      params,
    );
    return result.rows.map((row) => ({
      questionId: row.question_id,
      text: row.text,
      step: row.step,
      average: Number(row.average),
      count: row.count,
    }));
  }

  // RN21: média por etapa da jornada, na ordem em que o paciente passa por elas.
  async steps(filters: DashboardFilters): Promise<StepIndicator[]> {
    const { where, params } = buildWhere(filters);
    const result = await this.db().query(
      `SELECT q.step, ROUND(AVG(a.value)::numeric, 1) AS average, COUNT(*)::int AS count
       FROM answers a
       JOIN responses r ON r.id = a.response_id
       JOIN questions q ON q.id = a.question_id
       ${where}
       GROUP BY q.step
       ORDER BY array_position(ARRAY['RECEPCAO', 'TRIAGEM', 'ENFERMAGEM', 'MEDICO', 'GERAL'], q.step)`,
      params,
    );
    return result.rows.map((row) => ({ step: row.step, average: Number(row.average), count: row.count }));
  }

  // RN22: comparação por setor, turno ou equipe, pela nota geral (só respostas que têm nota geral).
  async breakdown(by: BreakdownBy, filters: DashboardFilters): Promise<BreakdownRow[]> {
    const { where, params } = buildWhere(filters, ['r.overall_score IS NOT NULL']);
    const totals = 'ROUND(AVG(r.overall_score)::numeric, 1) AS average, COUNT(*)::int AS count';

    const sql = {
      sector: `SELECT se.id::text AS key, se.name AS label, ${totals}
               FROM responses r JOIN sectors se ON se.id = r.sector_id
               ${where}
               GROUP BY se.id, se.name
               ORDER BY se.name`,
      shift: `SELECT r.shift AS key,
                     CASE r.shift WHEN 'MANHA' THEN 'Manhã' WHEN 'TARDE' THEN 'Tarde' ELSE 'Noite' END AS label,
                     ${totals}
              FROM responses r
              ${where}
              GROUP BY r.shift
              ORDER BY array_position(ARRAY['MANHA', 'TARDE', 'NOITE'], r.shift)`,
      // Respostas sem equipe na escala (team_id nulo) não entram aqui. "Equipe A" existe em vários
      // setores, por isso o nome do setor vai junto.
      team: `SELECT t.id::text AS key, t.name || ' · ' || se.name AS label, ${totals}
             FROM responses r
             JOIN teams t ON t.id = r.team_id
             JOIN sectors se ON se.id = t.sector_id
             ${where}
             GROUP BY t.id, t.name, se.name
             ORDER BY se.name, t.name`,
    }[by];

    const result = await this.db().query(sql, params);
    return result.rows.map((row) => ({
      key: row.key,
      label: row.label,
      average: Number(row.average),
      count: row.count,
    }));
  }

  // Evolução da nota geral, dia a dia (pela data do plantão).
  async timeline(filters: DashboardFilters): Promise<TimelinePoint[]> {
    const { where, params } = buildWhere(filters, ['r.overall_score IS NOT NULL']);
    const result = await this.db().query(
      `SELECT to_char(r.shift_date, 'YYYY-MM-DD') AS date,
              ROUND(AVG(r.overall_score)::numeric, 1) AS average, COUNT(*)::int AS count
       FROM responses r
       ${where}
       GROUP BY r.shift_date
       ORDER BY r.shift_date`,
      params,
    );
    return result.rows.map((row) => ({ date: row.date, average: Number(row.average), count: row.count }));
  }
}
