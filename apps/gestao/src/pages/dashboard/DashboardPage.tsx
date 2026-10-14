import type { JourneyStep, Shift } from '@avaliacoes/schemas';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  type BreakdownBy,
  type BreakdownRow,
  type DashboardFilters,
  type DashboardSummary,
  getBreakdown,
  getQuestions,
  getSteps,
  getSummary,
  getTimeline,
  type QuestionIndicator,
  type StepIndicator,
  type TimelinePoint,
} from '../../api/dashboard';
import { listSectors, type Sector } from '../../api/sectors';
import { useAuth } from '../../auth/AuthContext';
import AverageBars from '../../components/charts/AverageBars';
import FaceDistribution from '../../components/charts/FaceDistribution';
import { Face, faceFor, formatAverage } from '../../components/charts/faces';
import TimelineChart from '../../components/charts/TimelineChart';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input } from '../../components/ui/styles';
import BreakdownTable from './BreakdownTable';

const STEP_LABELS: Record<JourneyStep, string> = {
  RECEPCAO: 'Recepção',
  TRIAGEM: 'Triagem',
  ENFERMAGEM: 'Enfermagem',
  MEDICO: 'Médico',
  GERAL: 'Geral',
};

const SHIFT_LABELS: Record<Shift, string> = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' };

const BREAKDOWN_TITLES: Record<BreakdownBy, string> = {
  sector: 'Nota geral por setor',
  shift: 'Nota geral por turno',
  team: 'Nota geral por equipe',
};

// Data local no formato AAAA-MM-DD, "dias" atrás (0 = hoje).
function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface DashboardData {
  summary: DashboardSummary;
  steps: StepIndicator[];
  questions: QuestionIndicator[];
  breakdown: BreakdownRow[];
  timeline: TimelinePoint[];
}

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-5 ${className}`}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="font-bold text-muted">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// Tela inicial do site de gestão (README, seção 10; tarefa A14).
// Filtros por período, setor, turno e equipe, e navegação hospital → setor → turno → equipe (RN22).
// Admin de setor e visualizador ficam presos ao próprio setor (a API também garante isso).
export default function DashboardPage() {
  const { user } = useAuth();
  const restricted = user?.role !== 'SUPER_ADMIN';

  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    from: isoDaysAgo(29), // últimos 30 dias, contando hoje
    to: isoDaysAgo(0),
    sectorId: restricted ? (user?.sectorId ?? undefined) : undefined,
  }));
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<BreakdownRow[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastRequest = useRef(0);

  // Nível da comparação: sem setor → por setor; com setor → por turno; com turno → por equipe.
  const by: BreakdownBy = !filters.sectorId ? 'sector' : !filters.shift ? 'shift' : 'team';

  useEffect(() => {
    listSectors()
      .then((list) => setSectors(list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))))
      .catch(() => setSectors([]));
  }, []);

  // Equipes do setor escolhido, para o filtro de equipe (só as que têm respostas no período).
  useEffect(() => {
    if (!filters.sectorId) {
      setTeams([]);
      return;
    }
    getBreakdown('team', { sectorId: filters.sectorId, from: filters.from, to: filters.to })
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [filters.sectorId, filters.from, filters.to]);

  // Busca todos os indicadores de novo a cada mudança de filtro.
  useEffect(() => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError('');
    Promise.all([getSummary(filters), getSteps(filters), getQuestions(filters), getBreakdown(by, filters), getTimeline(filters)])
      .then(([summary, steps, questions, breakdown, timeline]) => {
        // Se a pessoa mudou o filtro no meio do caminho, ignora a resposta antiga.
        if (request === lastRequest.current) setData({ summary, steps, questions, breakdown, timeline });
      })
      .catch((err) => {
        if (request === lastRequest.current) {
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
        }
      })
      .finally(() => {
        if (request === lastRequest.current) setLoading(false);
      });
  }, [filters, by]);

  function update(changes: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  function drillDown(row: BreakdownRow) {
    if (by === 'sector') update({ sectorId: Number(row.key), shift: undefined, teamId: undefined });
    else if (by === 'shift') update({ shift: row.key as Shift, teamId: undefined });
    else update({ teamId: Number(row.key) });
  }

  const sectorName = sectors.find((s) => s.id === filters.sectorId)?.name ?? 'Setor';
  const teamName = teams.find((t) => Number(t.key) === filters.teamId)?.label.split(' · ')[0] ?? 'Equipe';

  // Caminho: Hospital › Setor › Turno › Equipe. Cada nível anterior é clicável para voltar.
  const crumbs: { label: string; onClick?: () => void }[] = [];
  if (!restricted) crumbs.push({ label: 'Hospital', onClick: () => update({ sectorId: undefined, shift: undefined, teamId: undefined }) });
  if (filters.sectorId) crumbs.push({ label: sectorName, onClick: () => update({ shift: undefined, teamId: undefined }) });
  if (filters.shift) crumbs.push({ label: SHIFT_LABELS[filters.shift], onClick: () => update({ teamId: undefined }) });
  if (filters.teamId) crumbs.push({ label: teamName });

  const summary = data?.summary;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <nav aria-label="Nível do dashboard" className="text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.label + i} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden="true">›</span>}
                  {last || !crumb.onClick ? (
                    <b className="text-ink" aria-current={last ? 'page' : undefined}>
                      {crumb.label}
                    </b>
                  ) : (
                    <button type="button" onClick={crumb.onClick} className="text-fhdod-red-dark underline">
                      {crumb.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Filtros, numa linha acima dos gráficos */}
      <form
        className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Filtros"
      >
        <label className="flex flex-col gap-1 font-bold text-muted">
          De
          <input
            type="date"
            className={input}
            value={filters.from ?? ''}
            max={filters.to}
            onChange={(e) => update({ from: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-col gap-1 font-bold text-muted">
          Até
          <input
            type="date"
            className={input}
            value={filters.to ?? ''}
            min={filters.from}
            onChange={(e) => update({ to: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-col gap-1 font-bold text-muted">
          Setor
          <select
            className={input}
            value={filters.sectorId ?? ''}
            disabled={restricted}
            onChange={(e) =>
              update({ sectorId: e.target.value ? Number(e.target.value) : undefined, shift: undefined, teamId: undefined })
            }
          >
            {!restricted && <option value="">Todos</option>}
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-bold text-muted">
          Turno
          <select
            className={input}
            value={filters.shift ?? ''}
            onChange={(e) => update({ shift: (e.target.value || undefined) as Shift | undefined, teamId: undefined })}
          >
            <option value="">Todos</option>
            {(Object.keys(SHIFT_LABELS) as Shift[]).map((shift) => (
              <option key={shift} value={shift}>
                {SHIFT_LABELS[shift]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-bold text-muted">
          Equipe
          <select
            className={input}
            value={filters.teamId ?? ''}
            disabled={!filters.sectorId}
            onChange={(e) => update({ teamId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">{filters.sectorId ? 'Todas' : 'Escolha um setor'}</option>
            {teams.map((team) => (
              <option key={team.key} value={team.key}>
                {team.label.split(' · ')[0]}
              </option>
            ))}
          </select>
        </label>
      </form>

      <ErrorMessage message={error} />
      {loading && !data && <p className="text-muted">Carregando...</p>}

      {data && summary && (
        <div className={`flex flex-col gap-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {/* RN20: nota geral + totais */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
              {summary.overallAverage !== null && <Face value={faceFor(summary.overallAverage)} className="h-14 w-14" />}
              <div>
                <p className="font-bold text-muted">Nota geral</p>
                <p className="text-3xl font-bold">
                  {formatAverage(summary.overallAverage)} <span className="text-base font-normal text-muted">de 5</span>
                </p>
              </div>
            </div>
            <Stat label="Respostas" value={summary.totalResponses} />
            <Stat label="Completas" value={summary.complete} />
            <Stat label="Parciais" value={summary.partial} />
            <Stat label="Abandonadas" value={summary.abandoned} />
          </div>

          {summary.totalResponses === 0 ? (
            <p className="rounded-xl border border-line bg-white p-5 text-muted">Nenhuma resposta com estes filtros.</p>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Avaliação geral: respostas por carinha">
                  <FaceDistribution distribution={summary.distribution} />
                </Card>
                <Card title="Média por etapa">
                  <AverageBars rows={data.steps.map((s) => ({ key: s.step, label: STEP_LABELS[s.step], average: s.average, count: s.count }))} />
                </Card>
                <Card title={BREAKDOWN_TITLES[by]}>
                  <BreakdownTable
                    by={by}
                    // Com o setor já escolhido, "Equipe A · Pronto Atendimento" vira só "Equipe A"
                    rows={data.breakdown.map((row) => (by === 'team' ? { ...row, label: row.label.split(' · ')[0] } : row))}
                    onSelect={filters.teamId ? undefined : drillDown}
                  />
                  {by === 'team' && (
                    <p className="mt-3 text-muted">Equipes com menos de 5 respostas não mostram a média (RN15).</p>
                  )}
                </Card>
              </div>

              <Card title="Nota geral por dia">
                <TimelineChart points={data.timeline} />
              </Card>

              <Card title="Média de cada pergunta">
                {!filters.sectorId ? (
                  <p className="text-muted">Escolha um setor para ver a média de cada pergunta da pesquisa dele.</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-line text-left text-muted">
                        <th className="py-2 pr-2 font-bold">Etapa</th>
                        <th className="py-2 pr-2 font-bold">Pergunta</th>
                        <th className="py-2 pr-2 text-right font-bold">Média</th>
                        <th className="py-2 text-right font-bold">Respostas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.questions.map((q) => (
                        <tr key={q.questionId} className="border-b border-disabled">
                          <td className="py-2 pr-2">{STEP_LABELS[q.step]}</td>
                          <td className="py-2 pr-2">{q.text}</td>
                          <td className="py-2 pr-2 text-right font-bold">{formatAverage(q.average)}</td>
                          <td className="py-2 text-right">{q.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
