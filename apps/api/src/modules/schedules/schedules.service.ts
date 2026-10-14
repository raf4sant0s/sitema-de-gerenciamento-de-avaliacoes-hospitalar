import type { Schedule, Shift, Team } from '@avaliacoes/schemas';
import type { ScheduleItem, SchedulesRepository } from '../../database/repositories/schedules.repository';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import { type AuthUser, assertSectorAccess } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// O que a API devolve (README, seção 9).
export interface TeamView {
  id: number;
  sectorId: number;
  name: string;
  active: boolean;
}

export interface ScheduleView {
  sectorId: number;
  shiftDate: string;
  shift: Shift;
  teamId: number;
}

const toTeamView = (team: Team): TeamView => ({ id: team.id, sectorId: team.sector_id, name: team.name, active: team.active });
const toScheduleView = (item: Schedule): ScheduleView => ({
  sectorId: item.sector_id,
  shiftDate: item.shift_date,
  shift: item.shift,
  teamId: item.team_id,
});

// Primeiro e último dia de um mês "AAAA-MM".
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

// Regras das equipes e da escala (tarefa B14; RN13, RN14, RN15, RN16).
// - Super admin: todos os setores. Admin de setor: só o dele. Visualizador: só vê (RN16).
// - Equipe não é apagada, é desativada (decisão da dupla).
// - Salvar a escala passa as respostas daquele dia e turno para a equipe nova (decisão da dupla).
export class SchedulesService {
  constructor(
    private readonly schedules: SchedulesRepository,
    private readonly sectors: SectorsRepository,
  ) {}

  async listTeams(me: AuthUser, sectorId?: number): Promise<TeamView[]> {
    if (me.role !== 'SUPER_ADMIN') sectorId = me.sectorId!;
    return (await this.schedules.listTeams(sectorId)).map(toTeamView);
  }

  async createTeam(me: AuthUser, sectorId: number, name: string): Promise<TeamView> {
    assertSectorAccess(me, sectorId);
    if (!(await this.sectors.findById(sectorId))) {
      throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
    }
    return toTeamView(await this.schedules.createTeam({ sectorId, name }));
  }

  async updateTeam(me: AuthUser, id: number, data: { name?: string; active?: boolean }): Promise<TeamView> {
    await this.findTeam(me, id);
    return toTeamView((await this.schedules.updateTeam(id, data))!);
  }

  async deactivateTeam(me: AuthUser, id: number): Promise<TeamView> {
    return this.updateTeam(me, id, { active: false });
  }

  async listSchedules(me: AuthUser, sectorId: number | undefined, month: string): Promise<ScheduleView[]> {
    if (me.role !== 'SUPER_ADMIN') sectorId = me.sectorId!;
    if (sectorId === undefined) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Escolha o setor');
    }
    assertSectorAccess(me, sectorId);
    const { from, to } = monthRange(month);
    return (await this.schedules.listSchedules(sectorId, from, to)).map(toScheduleView);
  }

  async saveSchedules(me: AuthUser, items: ScheduleItem[]): Promise<{ saved: number; responsesUpdated: number }> {
    // Confere todas as células antes de gravar qualquer uma.
    for (const item of items) {
      assertSectorAccess(me, item.sectorId);
      if (item.teamId === null) continue;

      const team = await this.schedules.findTeam(item.teamId);
      if (!team || team.sector_id !== item.sectorId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'A equipe escolhida não é deste setor');
      }
      if (!team.active) {
        throw new AppError(400, 'VALIDATION_ERROR', `A equipe "${team.name}" está desativada`);
      }
    }

    const { responsesUpdated } = await this.schedules.saveSchedules(items);
    return { saved: items.length, responsesUpdated };
  }

  private async findTeam(me: AuthUser, id: number): Promise<Team> {
    const team = await this.schedules.findTeam(id);
    if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'Equipe não encontrada');
    assertSectorAccess(me, team.sector_id);
    return team;
  }
}
