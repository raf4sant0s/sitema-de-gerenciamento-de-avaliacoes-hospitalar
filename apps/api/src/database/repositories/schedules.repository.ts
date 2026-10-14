import type { Schedule, Shift, Team } from '@avaliacoes/schemas';

// Uma célula da escala: setor + data do plantão + turno → equipe (RN14).
// teamId null = tirar a equipe daquela célula.
export interface ScheduleItem {
  sectorId: number;
  shiftDate: string; // AAAA-MM-DD
  shift: Shift;
  teamId: number | null;
}

// Contrato de acesso às equipes e à escala: O QUE dá para fazer, sem dizer qual banco é.
// A implementação com o Supabase está em ../supabase/schedules.repository.ts.
export interface SchedulesRepository {
  // Equipes em ordem alfabética (ativas e inativas). Com sectorId, só as daquele setor.
  listTeams(sectorId?: number): Promise<Team[]>;
  findTeam(id: number): Promise<Team | null>;
  createTeam(data: { sectorId: number; name: string }): Promise<Team>;
  updateTeam(id: number, data: { name?: string; active?: boolean }): Promise<Team | null>;

  // Escala de um setor entre duas datas (inclusive), em ordem de data e turno.
  listSchedules(sectorId: number, from: string, to: string): Promise<Schedule[]>;
  // Grava as células (cria, troca ou tira a equipe) e, na mesma transação, passa as respostas
  // daquele setor, dia e turno para a equipe nova (decisão da dupla). Devolve quantas respostas mudaram.
  saveSchedules(items: ScheduleItem[]): Promise<{ responsesUpdated: number }>;
}
