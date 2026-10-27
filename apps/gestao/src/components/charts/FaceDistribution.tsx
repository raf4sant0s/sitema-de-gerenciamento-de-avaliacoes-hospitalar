import { Face, FACES } from './faces';

interface FaceDistributionProps {
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

// RN20: quantas respostas houve em cada carinha da avaliação geral, da melhor (Ótimo, em cima) para a pior.
// Cada barra tem a carinha e o nome escritos ao lado: a cor nunca é a única pista.
export default function FaceDistribution({ distribution }: FaceDistributionProps) {
  const total = FACES.reduce((sum, face) => sum + distribution[String(face.value) as '1'], 0);
  const max = Math.max(1, ...FACES.map((face) => distribution[String(face.value) as '1']));

  return (
    <ul className="flex flex-col gap-2">
      {[...FACES].reverse().map((face) => {
        const count = distribution[String(face.value) as '1'];
        const percent = total ? Math.round((count / total) * 100) : 0;
        return (
          <li
            key={face.value}
            className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3"
            title={`${face.label}: ${count} resposta(s), ${percent}%`}
          >
            <span className="flex items-center gap-2">
              <Face value={face.value} />
              {face.label}
            </span>
            <span className="h-4 overflow-hidden rounded bg-disabled">
              <span
                className="block h-full rounded"
                style={{ width: `${(count / max) * 100}%`, background: face.color }}
              />
            </span>
            <span className="text-right">
              <b>{count}</b> <span className="text-muted">{percent}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
