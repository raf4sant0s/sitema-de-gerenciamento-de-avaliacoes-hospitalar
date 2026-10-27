import { Face, type FaceValue } from '../../components/charts/faces';

export interface PercentRow {
  key: string;
  label: string;
  percent: number; // 0 a 100
  color: string;
  face?: FaceValue;
}

// Barras em percentual para o TV Wall (RN18): fundo escuro, letras grandes, para ler de longe.
// O nome e o % ficam escritos ao lado de cada barra: a cor nunca é a única pista.
export default function PercentBars({ rows }: { rows: PercentRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.key}>
          <p className="mb-1 flex items-center gap-2 leading-tight">
            {row.face && <Face value={row.face} className="h-8 w-8" />}
            <span>{row.label}</span>
            <b className="ml-auto text-2xl">{row.percent}%</b>
          </p>
          <span className="block h-6 overflow-hidden rounded bg-[#444444]" aria-hidden="true">
            <span className="block h-full rounded" style={{ width: `${row.percent}%`, background: row.color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
