import type { Shift } from '@avaliacoes/schemas';
import type { ScheduleItem, Team } from '../../api/schedules';
import { shiftLabels } from '../../api/schedules';
import { input } from '../../components/ui/styles';

const SHIFTS: Shift[] = ['MANHA', 'TARDE', 'NOITE'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Todos os dias de um mês "AAAA-MM", como texto "AAAA-MM-DD".
export function daysOfMonth(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

export const cellKey = (shiftDate: string, shift: Shift) => `${shiftDate}|${shift}`;

// Grade da escala do mês: uma linha por dia, uma coluna por turno (RN13, RN14).
// Cada célula escolhe a equipe de plantão. Quem só pode ver (visualizador) vê os nomes, sem escolher.
export default function ScheduleGrid({
  month,
  teams,
  cells,
  canEdit,
  onChange,
}: {
  month: string;
  teams: Team[];
  cells: Map<string, number | null>;
  canEdit: boolean;
  onChange: (shiftDate: string, shift: Shift, teamId: number | null) => void;
}) {
  const teamName = (id: number | null | undefined) => teams.find((team) => team.id === id)?.name ?? '—';

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="sr-only">Escala do mês por dia e turno</caption>
        <thead>
          <tr className="border-b border-line bg-page text-left">
            <th scope="col" className="p-3">
              Dia
            </th>
            {SHIFTS.map((shift) => (
              <th key={shift} scope="col" className="p-3">
                {shiftLabels[shift]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daysOfMonth(month).map((day) => {
            const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
            const label = `${day.slice(8)}/${day.slice(5, 7)} (${weekday})`;
            return (
              <tr key={day} className="border-b border-line last:border-b-0">
                <th scope="row" className="whitespace-nowrap p-3 text-left font-normal">
                  {label}
                </th>
                {SHIFTS.map((shift) => {
                  const current = cells.get(cellKey(day, shift)) ?? null;
                  // Equipe desativada não aparece como opção nova, mas continua visível onde já estava.
                  const options = teams.filter((team) => team.active || team.id === current);
                  return (
                    <td key={shift} className="p-2">
                      {canEdit ? (
                        <select
                          aria-label={`Equipe de ${label}, ${shiftLabels[shift]}`}
                          value={current ?? ''}
                          onChange={(event) => onChange(day, shift, event.target.value ? Number(event.target.value) : null)}
                          className={input}
                        >
                          <option value="">— sem equipe —</option>
                          {options.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                              {team.active ? '' : ' (desativada)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{teamName(current)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
