import type {
  BreakdownBy,
  DashboardFilters,
  DashboardRepository,
} from '../../database/repositories/dashboard.repository';
import { assertSectorAccess, type AuthUser } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// RN15: indicador por equipe só aparece com 5 ou mais respostas.
export const MIN_RESPONSES_PER_TEAM = 5;

// Regras do dashboard. Usa só a interface do repositório, nunca o banco direto.
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  // RN22 / RN16: o super admin vê todos os setores. Admin de setor e visualizador só o próprio:
  // sem setor no filtro, fica o deles; pedindo outro setor, 403.
  private scope(user: AuthUser, filters: DashboardFilters): DashboardFilters {
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A data inicial é depois da data final');
    }

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
}
