import type { Shift } from '@avaliacoes/schemas';
import { api } from './client';

// Chamadas de equipes e escala para a API (README, seção 9; tarefa B14).

export interface Team {
  id: number;
  sectorId: number;
  name: string;
  active: boolean;
}

export interface ScheduleItem {
  sectorId: number;
  shiftDate: string; // AAAA-MM-DD
  shift: Shift;
  teamId: number | null; // null = sem equipe
}

// RN13: turnos fixos, no horário de Brasília. A madrugada é do plantão da noite anterior.
export const shiftLabels: Record<Shift, string> = {
  MANHA: 'Manhã (7h às 13h)',
  TARDE: 'Tarde (13h às 19h)',
  NOITE: 'Noite (19h às 7h)',
};

export function listTeams(sectorId?: number): Promise<Team[]> {
  return api<Team[]>(sectorId ? `/teams?sectorId=${sectorId}` : '/teams');
}

export function createTeam(sectorId: number, name: string): Promise<Team> {
  return api<Team>('/teams', { method: 'POST', body: JSON.stringify({ sectorId, name }) });
}

export function updateTeam(id: number, data: { name?: string; active?: boolean }): Promise<Team> {
  return api<Team>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function listSchedules(sectorId: number, month: string): Promise<ScheduleItem[]> {
  return api<ScheduleItem[]>(`/schedules?sectorId=${sectorId}&month=${month}`);
}

export function saveSchedules(items: ScheduleItem[]): Promise<{ saved: number; responsesUpdated: number }> {
  return api<{ saved: number; responsesUpdated: number }>('/schedules', { method: 'PUT', body: JSON.stringify({ items }) });
}
