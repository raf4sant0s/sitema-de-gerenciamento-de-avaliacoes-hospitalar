import type {
  BreakdownBy,
  DashboardFilters,
  DashboardRepository,
} from '../../database/repositories/dashboard.repository';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import { assertSectorAccess, type AuthUser } from '../../shared/auth';
import { AppError } from '../../shared/errors';
import { monthRange } from '../schedules/schedules.service';
import { buildExportWorkbook } from './excel';
import { buildSectorReportPdf } from './report-pdf';

// RN15: indicador por equipe só aparece com 5 ou mais respostas.
export const MIN_RESPONSES_PER_TEAM = 5;

// Percentual inteiro de 0 a 100 (TV Wall, RN18).
const percent = (part: number, total: number) => (total ? Math.round((part * 100) / total) : 0);

function checkPeriod(filters: Pick<DashboardFilters, 'from' | 'to'>) {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A data inicial é depois da data final');
  }
}

// Regras do dashboard. Usa só as interfaces dos repositórios, nunca o banco direto.
// Os setores do filtro do TV Wall vêm do repositório de setores da Pessoa B (B11).
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly sectors?: SectorsRepository,
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

  // RN23: relatório do setor num mês, em PDF. A rota só deixa os admins entrarem; aqui o admin de
  // setor fica preso ao próprio setor (RN16). Equipe com menos de 5 respostas: "dados insuficientes" (RN15, D4).
  async sectorReport(user: AuthUser, sectorId: number, month: string): Promise<{ file: Buffer; fileName: string }> {
    if (!this.sectors) throw new Error('DashboardService sem o repositório de setores');
    assertSectorAccess(user, sectorId);
    const sector = await this.sectors.findById(sectorId);
    if (!sector) throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');

    const filters = { ...monthRange(month), sectorId };
    const [summary, shifts, teams] = await Promise.all([
      this.repository.summary(filters),
      this.repository.breakdown('shift', filters),
      this.repository.breakdown('team', filters),
    ]);

    const file = await buildSectorReportPdf({
      sectorName: sector.name,
      month,
      summary,
      shifts: shifts.map((row) => ({ label: row.label, average: row.average, count: row.count })),
      // "Equipe A · Pronto Atendimento" vira só "Equipe A": o setor já está no título
      teams: teams.map((row) => ({
        label: row.label.split(' · ')[0],
        average: row.count < MIN_RESPONSES_PER_TEAM ? null : row.average,
        count: row.count,
      })),
    });
    return { file, fileName: `relatorio-${sector.slug}-${month}.pdf` };
  }

  // RN18 / D5: TV Wall público, sem login. Só percentuais de 0 a 100: nunca comentários,
  // quantidades de respostas ou equipes. Sem setor: hospital todo, comparando os setores;
  // com setor: só ele, comparando os turnos.
  async publicTv(filters: Pick<DashboardFilters, 'from' | 'to' | 'sectorId'>) {
    if (!this.sectors) throw new Error('DashboardService sem o repositório de setores');
    checkPeriod(filters);

    const activeSectors = (await this.sectors.list()).filter((sector) => sector.active);
    if (filters.sectorId !== undefined && !activeSectors.some((sector) => sector.id === filters.sectorId)) {
      throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
    }

    const scoped = { from: filters.from, to: filters.to, sectorId: filters.sectorId };
    const by = scoped.sectorId === undefined ? 'sector' : 'shift';
    const [summary, steps, items] = await Promise.all([
      this.repository.summary(scoped),
      this.repository.satisfactionBySteps(scoped),
      this.repository.satisfactionBy(by, scoped),
    ]);

    // As quantidades da nota geral viram percentuais aqui e nunca saem da API.
    const d = summary.distribution;
    const total = d[1] + d[2] + d[3] + d[4] + d[5];
    const overall = total
      ? {
          satisfied: percent(d[4] + d[5], total),
          distribution: { 1: percent(d[1], total), 2: percent(d[2], total), 3: percent(d[3], total), 4: percent(d[4], total), 5: percent(d[5], total) },
        }
      : null;

    return {
      sectors: activeSectors.map((sector) => ({ id: sector.id, name: sector.name })),
      overall,
      steps,
      breakdown: { by, items },
    };
  }
}
