import type { JourneyStep, Shift } from '@avaliacoes/schemas';
import { api, downloadFile } from './client';

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

// RN19 (A17): baixa a planilha das respostas, com os mesmos filtros da tela.
export function exportExcel(filters: DashboardFilters) {
  const period = [filters.from, filters.to].filter(Boolean).join('_a_');
  return downloadFile(`/dashboard/export.xlsx${query(filters)}`, `avaliacoes${period ? `_${period}` : ''}.xlsx`);
}

// TV Wall público, sem login (RN18, D5). Só percentuais inteiros de 0 a 100:
// nunca comentários, quantidades de respostas ou equipes. Satisfeito = Bom ou Ótimo.
export interface PublicTv {
  sectors: { id: number; name: string }[];
  overall: { satisfied: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number> } | null;
  steps: { step: JourneyStep; satisfied: number }[];
  breakdown: { by: 'sector' | 'shift'; items: { key: string; label: string; satisfied: number }[] };
}

export function getPublicTv(filters: Pick<DashboardFilters, 'from' | 'to' | 'sectorId'>) {
  return api<PublicTv>(`/public/tv${query(filters)}`);
}

// RN23: baixa o relatório do setor num mês ("AAAA-MM"), em PDF, para imprimir. Só os admins.
export function downloadSectorReport(sector: { id: number; slug: string }, month: string) {
  return downloadFile(`/dashboard/report.pdf?sectorId=${sector.id}&month=${month}`, `relatorio-${sector.slug}-${month}.pdf`);
}
