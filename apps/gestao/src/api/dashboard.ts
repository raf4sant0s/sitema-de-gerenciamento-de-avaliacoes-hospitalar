import type { JourneyStep, Shift } from '@avaliacoes/schemas';
import { api } from './client';

// Chamadas do dashboard para a API (README, seção 9; tarefas A13 e A14).

// Filtros do dashboard. O período é pela data do plantão (AAAA-MM-DD).
export interface DashboardFilters {
  from?: string;
  to?: string;
  sectorId?: number;
  shift?: Shift;
  teamId?: number;
}

export interface DashboardSummary {
  overallAverage: number | null;
  totalResponses: number;
  complete: number;
  partial: number;
  abandoned: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface QuestionIndicator {
  questionId: number;
  text: string;
  step: JourneyStep;
  average: number;
  count: number;
}

export interface StepIndicator {
  step: JourneyStep;
  average: number;
  count: number;
}

export type BreakdownBy = 'sector' | 'shift' | 'team';

export interface BreakdownRow {
  key: string;
  label: string;
  average: number | null; // null quando há "dados insuficientes" (RN15)
  count: number;
  insufficient: boolean;
}

export interface TimelinePoint {
  date: string;
  average: number;
  count: number;
}

// Monta "?from=...&sectorId=..." só com os filtros preenchidos.
function query(filters: DashboardFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function getSummary(filters: DashboardFilters) {
  return api<DashboardSummary>(`/dashboard/summary${query(filters)}`);
}

export function getQuestions(filters: DashboardFilters) {
  return api<QuestionIndicator[]>(`/dashboard/questions${query(filters)}`);
}

export function getSteps(filters: DashboardFilters) {
  return api<StepIndicator[]>(`/dashboard/steps${query(filters)}`);
}

export function getBreakdown(by: BreakdownBy, filters: DashboardFilters) {
  return api<BreakdownRow[]>(`/dashboard/breakdown${query(filters, { by })}`);
}

export function getTimeline(filters: DashboardFilters) {
  return api<TimelinePoint[]>(`/dashboard/timeline${query(filters)}`);
}

// TV Wall (RN18, A16): só o super admin. Comentários de todos os tipos e situações, os mais novos primeiro.
export interface TvComment {
  id: number;
  sectorId: number;
  sectorName: string;
  type: 'ELOGIO' | 'RECLAMACAO' | 'SUGESTAO' | null;
  text: string;
  status: 'NEW' | 'TREATED';
  createdAt: string;
}

export interface TvData {
  summary: DashboardSummary;
  sectors: BreakdownRow[];
  comments: TvComment[];
  totalComments: number;
}

export function getTv(period: Pick<DashboardFilters, 'from' | 'to'>) {
  return api<TvData>(`/dashboard/tv${query(period)}`);
}