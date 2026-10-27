// Carinhas de 1 a 5 (RN04), iguais às do site da pesquisa (guia de estilos, seção 4).

export type FaceValue = 1 | 2 | 3 | 4 | 5;

export const FACES: { value: FaceValue; label: string; color: string; mouth: string }[] = [
  { value: 1, label: 'Péssimo', color: '#E57373', mouth: 'M20 48 Q32 36 44 48' },
  { value: 2, label: 'Ruim', color: '#FFB74D', mouth: 'M21 46 Q32 41 43 46' },
  { value: 3, label: 'Regular', color: '#FFD54F', mouth: 'M21 44 L43 44' },
  { value: 4, label: 'Bom', color: '#AED581', mouth: 'M21 41 Q32 49 43 41' },
  { value: 5, label: 'Ótimo', color: '#81C784', mouth: 'M19 39 Q32 54 45 39' },
];

// Carinha mais perto de uma média (ex.: 3,7 → Bom).
export function faceFor(average: number): FaceValue {
  return Math.min(5, Math.max(1, Math.round(average))) as FaceValue;
}

// Média com 1 casa decimal e vírgula (ex.: 3,7). Sem nota: "—".
export function formatAverage(average: number | null): string {
  if (average === null) return '—';
  return average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Contorno, olhos e boca em cinza escuro: a expressão aparece mesmo para quem não distingue cores.
export function Face({ value, className = 'h-6 w-6' }: { value: FaceValue; className?: string }) {
  const face = FACES[value - 1];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="32" cy="32" r="29" fill={face.color} stroke="#2B2B2B" strokeWidth="3" />
      <circle cx="22" cy="26" r="3.6" fill="#2B2B2B" />
      <circle cx="42" cy="26" r="3.6" fill="#2B2B2B" />
      <path d={face.mouth} fill="none" stroke="#2B2B2B" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
