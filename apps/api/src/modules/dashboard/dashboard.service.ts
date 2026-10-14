import type { CommentsRepository } from '../../database/repositories/comments.repository';
import type {
  BreakdownBy,
  DashboardFilters,
  DashboardRepository,
} from '../../database/repositories/dashboard.repository';
import { assertSectorAccess, type AuthUser } from '../../shared/auth';
import { AppError } from '../../shared/errors';
import { buildExportWorkbook } from './excel';

// RN15: indicador por equipe só aparece com 5 ou mais respostas.
export const MIN_RESPONSES_PER_TEAM = 5;

// TV Wall: quantos comentários mostrar de uma vez (os mais recentes). Cabe na tela grande.
export const TV_COMMENTS = 50;

function checkPeriod(filters: Pick<DashboardFilters, 'from' | 'to'>) {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A data inicial é depois da data final');
  }
}

// Regras do dashboard. Usa só as interfaces dos repositórios, nunca o banco direto.
// Os comentários do TV Wall vêm do repositório de comentários da Pessoa B (B15), sem SQL repetido.
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly comments?: CommentsRepository,
  ) {}

  // RN22 / RN16: o super admin vê todos os setores. Admin de setor e visualizador só o próprio:
  // sem setor no filtro, fica o deles; pedindo outro setor, 403.
  private scope(user: AuthUser, filters: DashboardFilters): DashboardFilters {
    checkPeriod(filters);

    if (user.role === 'SUPER_ADMIN') return filters;

    if (filters.sectorId !== undefined) {
      assertSectorAccess(user, filters.sectorId);
      return filters;
    }
    return { ...filters, sectorId: user.sectorId ?? -1 };
  }

  summary(user: AuthUser, filters: DashboardFilters) {
    return this.repository.summary(this.scope(user, filters));
  }

  questions(user: AuthUser, filters: DashboardFilters) {
    return this.repository.questions(this.scope(user, filters));
  }

  steps(user: AuthUser, filters: DashboardFilters) {
    return this.repository.steps(this.scope(user, filters));
  }

  // RN15: por equipe, abaixo de 5 respostas a média não é mostrada ("dados insuficientes"),
  // para não responsabilizar uma equipe por poucas avaliações (D4).
  async breakdown(user: AuthUser, by: BreakdownBy, filters: DashboardFilters) {
    const rows = await this.repository.breakdown(by, this.scope(user, filters));
    return rows.map((row) => {
      const insufficient = by === 'team' && row.count < MIN_RESPONSES_PER_TEAM;
      return { ...row, average: insufficient ? null : row.average, insufficient };
    });
  }

  timeline(user: AuthUser, filters: DashboardFilters) {
    return this.repository.timeline(this.scope(user, filters));
  }

  // RN19: planilha com as respostas, com os mesmos filtros (e a mesma restrição de setor) do dashboard.
  async exportExcel(user: AuthUser, filters: DashboardFilters): Promise<{ file: Buffer; fileName: string }> {
    const scoped = this.scope(user, filters);
    const [responses, answers] = await Promise.all([
      this.repository.exportResponses(scoped),
      this.repository.exportAnswers(scoped),
    ]);

    // Nomes para a aba "Filtros" (vêm das próprias respostas exportadas).
    const sectorName = scoped.sectorId !== undefined ? (responses[0]?.sectorName ?? `Setor ${scoped.sectorId}`) : undefined;
    const teamName = scoped.teamId !== undefined ? (responses[0]?.teamName ?? `Equipe ${scoped.teamId}`) : undefined;

    const file = await buildExportWorkbook(responses, answers, { ...scoped, sectorName, teamName });
    const period = [scoped.from, scoped.to].filter(Boolean).join('_a_');
    return { file, fileName: `avaliacoes${period ? `_${period}` : ''}.xlsx` };
  }

  // RN18 / D5: TV Wall do super admin (a rota já barra os outros perfis).
  // Hospital inteiro: só o período vale como filtro. Comentários de todos os tipos e situações,
  // sem exceção, dos mais recentes para os mais antigos.
  async tv(filters: Pick<DashboardFilters, 'from' | 'to'>) {
    if (!this.comments) throw new Error('DashboardService sem o repositório de comentários');
    const period = { from: filters.from, to: filters.to };
    checkPeriod(period);

    const [summary, sectors, page] = await Promise.all([
      this.repository.summary(period),
      this.repository.breakdown('sector', period),
      this.comments.list({ from: period.from, to: period.to, limit: TV_COMMENTS, offset: 0 }),
    ]);

    return {
      summary,
      sectors,
      comments: page.items.map((comment) => ({
        id: comment.id,
        sectorId: comment.sectorId,
        sectorName: comment.sectorName,
        type: comment.type,
        text: comment.text,
        status: comment.status,
        createdAt: comment.createdAt,
      })),
      totalComments: page.total,
    };
  }
}
