import type { BreakdownBy, BreakdownRow } from '../../api/dashboard';
import { Face, faceFor, formatAverage } from '../../components/charts/faces';

const TITLES: Record<BreakdownBy, string> = { sector: 'Setor', shift: 'Turno', team: 'Equipe' };

interface BreakdownTableProps {
  by: BreakdownBy;
  rows: BreakdownRow[];
  // Tocar numa linha "desce" um nível: hospital → setor → turno → equipe (RN22).
  onSelect?: (row: BreakdownRow) => void;
}

// Comparação da nota geral por setor, turno ou equipe.
// RN15 / D4: equipe com menos de 5 respostas mostra "Dados insuficientes" no lugar da média.
export default function BreakdownTable({ by, rows, onSelect }: BreakdownTableProps) {
  if (rows.length === 0) {
    return <p className="text-muted">Sem respostas com nota geral para comparar.</p>;
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b-2 border-line text-left text-muted">
          <th className="py-2 pr-2 font-bold">{TITLES[by]}</th>
          <th className="py-2 pr-2 text-right font-bold">Média</th>
          <th className="py-2 text-right font-bold">Respostas</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-disabled">
            <td className="py-2 pr-2">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  className="text-left font-bold text-fhdod-red-dark underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {row.label}
                </button>
              ) : (
                row.label
              )}
            </td>
            <td className="py-2 pr-2 text-right">
              {row.insufficient ? (
                <span className="rounded-full bg-disabled px-2 py-0.5 font-bold">Dados insuficientes</span>
              ) : (
                <span className="inline-flex items-center gap-2 font-bold">
                  {row.average !== null && <Face value={faceFor(row.average)} className="h-5 w-5" />}
                  {formatAverage(row.average)}
                </span>
              )}
            </td>
            <td className="py-2 text-right">{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
