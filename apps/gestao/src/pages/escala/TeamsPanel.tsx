import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { createTeam, type Team, updateTeam } from '../../api/schedules';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';

// Equipes do setor (tarefa B14). RN15: a avaliação é ligada à equipe, nunca a uma pessoa.
// Decisão da dupla: equipe não é apagada, é desativada (some das opções da escala).
export default function TeamsPanel({
  sectorId,
  teams,
  canEdit,
  onChanged,
}: {
  sectorId: number;
  teams: Team[];
  canEdit: boolean;
  onChanged: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      onChanged(await createTeam(sectorId, name.trim()));
      setName('');
    });
  }

  function toggle(team: Team) {
    if (team.active && !window.confirm(`Desativar "${team.name}"? Ela some das opções da escala; o histórico continua.`)) return;
    void run(async () => onChanged(await updateTeam(team.id, { active: !team.active })));
  }

  return (
    <section aria-labelledby="teams-title" className="rounded-xl border border-line bg-white p-4">
      <h2 id="teams-title" className="text-xl font-bold">
        Equipes
      </h2>

      {teams.length === 0 && <p className="mt-2 text-muted">Nenhuma equipe cadastrada neste setor.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-b-0">
            <span className={team.active ? 'font-bold' : 'text-muted'}>
              {team.name}
              {!team.active && ' (desativada)'}
            </span>
            {canEdit && (
              <button type="button" disabled={busy} onClick={() => toggle(team)} className={secondaryButton}>
                {team.active ? 'Desativar' : 'Reativar'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2" noValidate>
          <div className="min-w-48 flex-1">
            <label htmlFor="team-name" className="block font-bold">
              Nova equipe
            </label>
            <input
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Equipe A"
              className={`mt-1 ${input}`}
            />
          </div>
          <button type="submit" disabled={busy || !name.trim()} className={primaryButton}>
            Adicionar equipe
          </button>
        </form>
      )}

      <div className="mt-3">
        <ErrorMessage message={error} />
      </div>
    </section>
  );
}
