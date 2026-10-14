import type { JourneyStep, Shift } from '@avaliacoes/schemas';

// Contrato dos indicadores do dashboard (README, seção 9): O QUE dá para calcular, sem dizer qual banco é.
// A implementação com o Supabase está em ../supabase/dashboard.repository.ts.

// Filtros já conferidos pelo service. O período é pela data do plantão (shift_date, RN13).
export interface DashboardFilters {
  from?: string; // AAAA-MM-DD
  to?: string; // AAAA-MM-DD
  sectorId?: number;
  shift?: Shift;
  teamId?: number;
}

// Médias de 1 a 5 com 1 casa decimal (RN20, RN21). null quando não há nenhuma nota.
export interface DashboardSummary {
  overallAverage: number | null;
  totalResponses: number;
  complete: number;
  partial: number;
  abandoned: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
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

// Uma linha da comparação: média da nota geral e quantas respostas com nota geral.
export interface BreakdownRow {
  key: string;
  label: string;
  average: number;
  count: number;
}

export interface TimelinePoint {
  date: string; // AAAA-MM-DD (data do plantão)
  average: number;
  count: number;
}

export interface DashboardRepository {
  summary(filters: DashboardFilters): Promise<DashboardSummary>;
  questions(filters: DashboardFilters): Promise<QuestionIndicator[]>;
  steps(filters: DashboardFilters): Promise<StepIndicator[]>;
  breakdown(by: BreakdownBy, filters: DashboardFilters): Promise<BreakdownRow[]>;
  timeline(filters: DashboardFilters): Promise<TimelinePoint[]>;
}
