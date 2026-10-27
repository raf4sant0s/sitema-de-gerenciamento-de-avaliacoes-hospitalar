import type { JourneyStep } from '@avaliacoes/schemas';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { getPublicTv, type PublicTv } from '../../api/dashboard';
import { FACES } from '../../components/charts/faces';
import { usePublicTvRealtime } from '../dashboard/useRealtime';
import PercentBars from './PercentBars';

// TV Wall (README, seção 10; RN18, D5). Página própria, num link separado (/tv), que abre
// SEM login e não aparece no menu. É só para visualizar, numa tela grande: fundo escuro e letras grandes.
// Só gráficos de barra em percentual: nunca comentários, número de respostas ou equipes.
// Filtros: período (começa nos últimos 30 dias) e setor. Atualiza sozinha com o tempo real (A15).

const PERIOD_DAYS = 30;

// Satisfeito = Bom ou Ótimo. Mesma cor do "Bom" das carinhas.
const SATISFIED_COLOR = '#AED581';

const STEP_LABELS: Record<JourneyStep, string> = {
  RECEPCAO: 'Recepção',
  TRIAGEM: 'Triagem',
  ENFERMAGEM: 'Enfermagem',
  MEDICO: 'Médico',
  GERAL: 'Avaliação geral',
};

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const field =
  'min-h-12 rounded-lg border border-[#5A5A5A] bg-[#383838] px-3 text-lg text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function TvWallPage() {
  const [from, setFrom] = useState(() => isoDaysAgo(PERIOD_DAYS - 1));
  const [to, setTo] = useState(() => isoDaysAgo(0));
  const [sectorId, setSectorId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<PublicTv | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const wall = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca os dados ao abrir, ao mudar um filtro e a cada aviso de tempo real.
  useEffect(() => {
    let cancelled = false;
    getPublicTv({ from: from || undefined, to: to || undefined, sectorId })
      .then((tv) => {
        if (cancelled) return;
        setData(tv);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o TV Wall.');
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, sectorId, refresh]);

  // A15: resposta nova no setor da tela (ou em qualquer setor, no hospital todo) → busca de novo.
  // Vários avisos seguidos viram uma busca só.
  const live = usePublicTvRealtime((changedSector) => {
    if (sectorId !== undefined && changedSector !== sectorId) return;
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      setRefresh((n) => n + 1);
    }, 1000);
  });

  // Relógio e limpeza do timer.
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    const onFullscreen = () => setFullscreen(document.fullscreenElement === wall.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      clearInterval(clock);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wall.current?.requestFullscreen();
  }

  const sectorName = data?.sectors.find((sector) => sector.id === sectorId)?.name;

  return (
    <div ref={wall} className="flex min-h-screen flex-col bg-[#1F1F1F] text-xl text-white">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-[6px] border-fhdod-red bg-white px-6 py-3 text-ink">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-11" />
        <h1 className="text-2xl font-bold">{sectorName ?? 'Painel do hospital'}</h1>
        <p className="ml-auto text-2xl font-bold" aria-label="Data e hora">
          {now.toLocaleDateString('pt-BR')} · {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {live && (
          <p className="flex items-center gap-2 font-bold text-success">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-success" />
            Ao vivo
          </p>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-xl border border-fhdod-red-dark px-4 py-2 text-base font-bold text-fhdod-red-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
      </header>

      {/* Filtros: período e setor */}
      <form
        aria-label="Filtros"
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-wrap items-end gap-4 px-5 pt-5"
      >
        <label className="flex flex-col gap-1 text-base font-bold text-[#CFCFCF]">
          De
          <input type="date" className={field} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-base font-bold text-[#CFCFCF]">
          Até
          <input type="date" className={field} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-base font-bold text-[#CFCFCF]">
          Setor
          <select
            className={field}
            value={sectorId ?? ''}
            onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Hospital todo</option>
            {data?.sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <p className="ml-auto text-base text-[#CFCFCF]">Satisfeitos = respostas Bom ou Ótimo</p>
      </form>

      {error && (
        <p role="alert" className="m-5 flex items-start gap-2 rounded-xl bg-white p-4 font-bold text-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      {!data && !error && <p className="m-5 text-[#CFCFCF]">Carregando...</p>}

      {data && !data.overall && <p className="m-5 rounded-xl bg-[#2C2C2C] p-6 text-[#CFCFCF]">Sem respostas no período.</p>}

      {data?.overall && (
        <div className="grid flex-1 gap-5 p-5 lg:grid-cols-3">
          {/* Avaliação geral: % de satisfeitos e % de cada carinha */}
          <section className="rounded-xl bg-[#2C2C2C] p-6">
            <h2 className="mb-3 text-[#CFCFCF]">Avaliação geral</h2>
            <p className="mb-5">
              <b className="text-7xl leading-none">{data.overall.satisfied}%</b>{' '}
              <span className="text-2xl text-[#E0E0E0]">satisfeitos</span>
            </p>
            <PercentBars
              rows={[...FACES].reverse().map((face) => ({
                key: String(face.value),
                label: face.label,
                percent: data.overall!.distribution[String(face.value) as '1'],
                color: face.color,
                face: face.value,
              }))}
            />
          </section>

          <section className="rounded-xl bg-[#2C2C2C] p-6">
            <h2 className="mb-3 text-[#CFCFCF]">Satisfeitos por etapa</h2>
            <PercentBars
              rows={data.steps.map((step) => ({
                key: step.step,
                label: STEP_LABELS[step.step],
                percent: step.satisfied,
                color: SATISFIED_COLOR,
              }))}
            />
          </section>

          <section className="rounded-xl bg-[#2C2C2C] p-6">
            <h2 className="mb-3 text-[#CFCFCF]">
              {data.breakdown.by === 'sector' ? 'Satisfeitos por setor' : 'Satisfeitos por turno'}
            </h2>
            <PercentBars
              rows={data.breakdown.items.map((item) => ({
                key: item.key,
                label: item.label,
                percent: item.satisfied,
                color: SATISFIED_COLOR,
              }))}
            />
          </section>
        </div>
      )}
    </div>
  );
}
