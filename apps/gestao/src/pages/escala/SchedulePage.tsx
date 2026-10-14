import type { Shift } from '@avaliacoes/schemas';
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { listSchedules, listTeams, saveSchedules, type ScheduleItem, type Team } from '../../api/schedules';
import { listSectors, type Sector } from '../../api/sectors';
import { useAuth } from '../../auth/AuthContext';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton } from '../../components/ui/styles';
import ScheduleGrid, { cellKey } from './ScheduleGrid';
import TeamsPanel from './TeamsPanel';

// Mês atual no horário de Brasília, como "AAAA-MM".
function currentMonth(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
}

// Tela /escala (README, seção 10; tarefa B14): equipes do setor e escala do mês (RN13, RN14).
// Super admin escolhe o setor; admin de setor edita o seu; visualizador só vê (RN16).
export default function SchedulePage() {
  const { user } = useAuth();
  const canEdit = user!.role !== 'VIEWER';

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorId, setSectorId] = useState<number | null>(user!.role === 'SUPER_ADMIN' ? null : user!.sectorId);
  const [month, setMonth] = useState(currentMonth());
  const [teams, setTeams] = useState<Team[]>([]);
  const [saved, setSaved] = useState(new Map<string, number | null>()); // como está na API
  const [cells, setCells] = useState(new Map<string, number | null>()); // como está na tela
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listSectors()
      .then((list) => {
        setSectors(list);
        if (user!.role === 'SUPER_ADMIN' && list.length > 0) setSectorId((current) => current ?? list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os setores.'));
  }, [user]);

  // Recarrega equipes e escala quando muda o setor ou o mês.
  useEffect(() => {
    if (sectorId === null || !month) return;
    setLoading(true);
    setError('');
    setMessage('');
    Promise.all([listTeams(sectorId), listSchedules(sectorId, month)])
      .then(([teamList, items]) => {
        setTeams(teamList);
        const map = new Map(items.map((item) => [cellKey(item.shiftDate, item.shift), item.teamId] as const));
        setSaved(map);
        setCells(new Map(map));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a escala.'))
      .finally(() => setLoading(false));
  }, [sectorId, month]);

  // Só as células que mudaram desde a última vez que gravou.
  const changes: ScheduleItem[] = [...cells.entries()]
    .filter(([key, teamId]) => (saved.get(key) ?? null) !== teamId)
    .map(([key, teamId]) => {
      const [shiftDate, shift] = key.split('|');
      return { sectorId: sectorId!, shiftDate, shift: shift as Shift, teamId };
    });

  function changeCell(shiftDate: string, shift: Shift, teamId: number | null) {
    setMessage('');
    setCells((map) => new Map(map).set(cellKey(shiftDate, shift), teamId));
  }

  async function handleSave() {
    setError('');
    setMessage('');
    setSending(true);
    try {
      const result = await saveSchedules(changes);
      setSaved(new Map(cells));
      setMessage(
        result.responsesUpdated > 0
          ? `Escala salva. ${result.responsesUpdated} resposta(s) desses dias e turnos passaram para a equipe da escala.`
          : 'Escala salva.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a escala.');
    } finally {
      setSending(false);
    }
  }

  function replaceTeam(team: Team) {
    setTeams((list) => {
      const exists = list.some((item) => item.id === team.id);
      const next = exists ? list.map((item) => (item.id === team.id ? team : item)) : [...list, team];
      return next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Escala</h1>
      <p className="-mt-4 text-muted">
        Quem estava de plantão em cada dia e turno. As respostas dos pacientes são ligadas à equipe da escala, nunca a uma
        pessoa. A noite vai das 19h às 7h: a madrugada conta como plantão da noite anterior.
      </p>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="schedule-sector" className="block font-bold">
            Setor
          </label>
          <select
            id="schedule-sector"
            value={sectorId ?? ''}
            disabled={user!.role !== 'SUPER_ADMIN'}
            onChange={(event) => setSectorId(Number(event.target.value))}
            className={`mt-1 ${input}`}
          >
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="schedule-month" className="block font-bold">
            Mês
          </label>
          <input
            id="schedule-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={`mt-1 ${input}`}
          />
        </div>
      </div>

      <ErrorMessage message={error} />
      {loading && <p className="text-muted">Carregando...</p>}

      {sectorId !== null && !loading && (
        <>
          <TeamsPanel sectorId={sectorId} teams={teams} canEdit={canEdit} onChanged={replaceTeam} />

          <ScheduleGrid month={month} teams={teams} cells={cells} canEdit={canEdit} onChange={changeCell} />

          {canEdit && (
            <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-page py-3">
              <button type="button" disabled={sending || changes.length === 0} onClick={handleSave} className={primaryButton}>
                {sending ? 'Salvando...' : 'Salvar escala'}
              </button>
              <span className="text-muted">
                {changes.length > 0 ? `${changes.length} alteração(ões) não salva(s)` : 'Nenhuma alteração pendente'}
              </span>
              {message && (
                <p role="status" className="flex items-start gap-2 text-success">
                  <span aria-hidden="true">✓</span>
                  <span>{message}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
