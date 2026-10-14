import { useState } from 'react';
import { formatAverage } from './faces';

interface TimelineChartProps {
  points: { date: string; average: number; count: number }[];
}

const W = 720;
const H = 220;
const PAD = { left: 36, right: 16, top: 12, bottom: 34 };

// "2026-10-14" → "14/10"
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

// Nota geral dia a dia: uma linha só, escala fixa de 1 a 5.
// Passar o mouse mostra o dia, a média e quantas respostas. Também há uma tabela para leitor de tela.
export default function TimelineChart({ points }: TimelineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-muted">Sem respostas com nota geral neste período.</p>;
  }

  const x = (i: number) =>
    points.length === 1 ? (PAD.left + W - PAD.right) / 2 : PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1);
  const y = (value: number) => PAD.top + ((5 - value) / 4) * (H - PAD.top - PAD.bottom);
  const labelEvery = Math.ceil(points.length / 8); // no máximo ~8 datas no eixo, para não encavalar
  const active = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Nota geral por dia">
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#E6E6E6" />
            <text x={PAD.left - 10} y={y(v) + 6} textAnchor="end" fontSize="16" fill="#5F5F5F">
              {v}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="16" fill="#5F5F5F">
              {shortDate(p.date)}
            </text>
          ) : null,
        )}
        {active && hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#5F5F5F" strokeDasharray="4 4" />
        )}
        <polyline
          fill="none"
          stroke="#B8242B"
          strokeWidth="2"
          strokeLinejoin="round"
          points={points.map((p, i) => `${x(i)},${y(p.average)}`).join(' ')}
        />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.average)} r={hover === i ? 6 : 4} fill="#B8242B" stroke="#FFFFFF" strokeWidth="2" />
        ))}
        {/* Áreas invisíveis, maiores que o ponto, para o mouse achar cada dia com facilidade */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={x(i) - (W - PAD.left - PAD.right) / Math.max(1, points.length - 1) / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / Math.max(1, points.length - 1)}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-white px-3 py-2 shadow"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <b>{shortDate(active.date)}</b>: média {formatAverage(active.average)} · {active.count} resposta(s)
        </div>
      )}

      <table className="sr-only">
        <caption>Nota geral por dia</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Média</th>
            <th>Respostas</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{shortDate(p.date)}</td>
              <td>{formatAverage(p.average)}</td>
              <td>{p.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
