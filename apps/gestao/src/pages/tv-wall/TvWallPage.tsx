import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { typeLabels } from '../../api/comments';
import { getTv, type TvComment, type TvData } from '../../api/dashboard';
import { Face, faceFor, formatAverage } from '../../components/charts/faces';
import { useRealtime } from '../dashboard/useRealtime';

// TV Wall (README, seção 10; RN18, D5; tarefa A16). Só o super admin abre (auth/menu.ts e a API).
// Tela grande, para ler de longe: fundo escuro, letras grandes, nota geral, setores e
// TODOS os comentários (de todos os tipos e situações), os mais novos primeiro.
// Atualiza sozinha com o tempo real (A15).

const PERIOD_DAYS = 30;

// Cor da faixa de cada tipo de comentário. O nome do tipo sempre vai escrito junto (nunca só a cor).
const TYPE_COLORS: Record<NonNullable<TvComment['type']> | 'NONE', string> = {
  ELOGIO: '#66BB6A',
  RECLAMACAO: '#EF5350',
  SUGESTAO: '#FFCA28',
  NONE: '#9E9E9E',
};

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

export default function TvWallPage() {
  const [data, setData] = useState<TvData | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const wall = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca os dados ao abrir e a cada aviso de tempo real.
  useEffect(() => {
    let cancelled = false;
    getTv({ from: isoDaysAgo(PERIOD_DAYS - 1), to: isoDaysAgo(0) })
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
  }, [refresh]);

  // A15: resposta ou comentário novo em qualquer setor → busca de novo (vários avisos seguidos viram uma busca só).
  const live = useRealtime(['response:changed', 'comment:created'], () => {
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

  const summary = data?.summary;

  return (
    <div
      ref={wall}
      className={`flex flex-col overflow-hidden rounded-xl bg-[#1F1F1F] text-xl text-white ${fullscreen ? 'h-screen rounded-none' : 'min-h-[calc(100vh-3rem)]'}`}
    >
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-[6px] border-fhdod-red bg-white px-6 py-3 text-ink">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-11" />
        <h1 className="text-2xl font-bold">Painel do hospital</h1>
        <p className="text-muted">Últimos {PERIOD_DAYS} dias</p>
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

      {error && (
        <p role="alert" className="m-6 flex items-start gap-2 rounded-xl bg-white p-4 font-bold text-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      {!data && !error && <p className="m-6 text-[#CFCFCF]">Carregando...</p>}

      {summary && data && (
        <div className="grid min-h-0 flex-1 gap-5 p-5 lg:grid-cols-[1fr_1.15fr]">
          <div className="flex min-h-0 flex-col gap-5">
            {/* RN20: nota geral do hospital */}
            <section className="rounded-xl bg-[#2C2C2C] p-6">
              <h2 className="mb-3 text-[#CFCFCF]">Nota geral</h2>
              <div className="flex flex-wrap items-center gap-6">
                {summary.overallAverage !== null && <Face value={faceFor(summary.overallAverage)} className="h-24 w-24" />}
                <p className="text-7xl leading-none font-bold">
                  {formatAverage(summary.overallAverage)} <span className="text-3xl font-normal text-[#BDBDBD]">de 5</span>
                </p>
                <p className="text-[#E0E0E0]">
                  {summary.totalResponses} respostas
                  <br />
                  {summary.complete} completas
                </p>
              </div>
            </section>

            {/* Nota de cada setor */}
            <section className="flex-1 rounded-xl bg-[#2C2C2C] p-6">
              <h2 className="mb-3 text-[#CFCFCF]">Por setor</h2>
              {data.sectors.length === 0 ? (
                <p className="text-[#CFCFCF]">Sem respostas no período.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.sectors.map((sector) => (
                    <li key={sector.key} className="flex items-center gap-3 rounded-lg bg-[#383838] px-4 py-3">
                      {sector.average !== null && <Face value={faceFor(sector.average)} className="h-10 w-10" />}
                      <span className="leading-tight">
                        {sector.label}
                        <span className="block text-base text-[#BDBDBD]">{sector.count} respostas</span>
                      </span>
                      <b className="ml-auto text-3xl">{formatAverage(sector.average)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* RN18 / D5: todos os comentários, sem exceção */}
          <section className="flex min-h-0 flex-col rounded-xl bg-[#2C2C2C] p-6">
            <h2 className="mb-3 text-[#CFCFCF]">Comentários · mais recentes primeiro</h2>
            {data.comments.length === 0 ? (
              <p className="text-[#CFCFCF]">Nenhum comentário no período.</p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-label="Comentários">
                {data.comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-lg border-l-[6px] bg-[#383838] px-4 py-3"
                    style={{ borderLeftColor: TYPE_COLORS[comment.type ?? 'NONE'] }}
                  >
                    <p className="mb-1 flex flex-wrap items-center gap-x-3 text-base text-[#BDBDBD]">
                      <b className="text-white">{comment.type ? typeLabels[comment.type] : 'Sem tipo'}</b>
                      <span>{comment.sectorName}</span>
                      <span>{dateTime(comment.createdAt)}</span>
                      {comment.status === 'TREATED' && (
                        <span className="rounded-full bg-[#2E7D32] px-2 font-bold text-white">✓ Tratado</span>
                      )}
                    </p>
                    <p className="leading-snug">{comment.text}</p>
                  </li>
                ))}
              </ul>
            )}
            {data.totalComments > data.comments.length && (
              <p className="mt-3 text-base text-[#BDBDBD]">
                Mostrando os {data.comments.length} mais recentes de {data.totalComments}.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
