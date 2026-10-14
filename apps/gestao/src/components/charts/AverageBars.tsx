import { formatAverage } from './faces';

interface AverageBarsProps {
  rows: { key: string; label: string; average: number; count: number }[];
}

// Médias de 1 a 5 em barras (RN21). Uma série só, numa cor neutra: o nome e o número
// ficam escritos ao lado de cada barra.
export default function AverageBars({ rows }: AverageBarsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3"
          title={`${row.label}: média ${formatAverage(row.average)} em ${row.count} resposta(s)`}
        >
          <span>{row.label}</span>
          <span className="h-4 overflow-hidden rounded bg-disabled">
            <span className="block h-full rounded bg-ink" style={{ width: `${(row.average / 5) * 100}%` }} />
          </span>
          <span className="text-right">
            <b>{formatAverage(row.average)}</b> <span className="text-muted">({row.count})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
