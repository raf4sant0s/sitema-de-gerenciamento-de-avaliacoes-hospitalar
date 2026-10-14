import { FACES, type FaceValue } from './faces';

interface FaceProps {
  value: FaceValue;
  className?: string;
}

// Desenho de uma carinha. Contorno, olhos e boca ficam em cinza escuro para a expressão
// aparecer mesmo para quem não distingue as cores (guia de estilos, seção 4).
export default function Face({ value, className = 'h-13 w-13' }: FaceProps) {
  const face = FACES[value - 1];

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="29" fill={face.color} stroke="#2B2B2B" strokeWidth="3" />
      <circle cx="22" cy="26" r="3.6" fill="#2B2B2B" />
      <circle cx="42" cy="26" r="3.6" fill="#2B2B2B" />
      <path d={face.mouth} fill="none" stroke="#2B2B2B" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
