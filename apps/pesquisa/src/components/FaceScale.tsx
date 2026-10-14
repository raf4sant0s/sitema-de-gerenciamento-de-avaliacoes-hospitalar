import Face from './Face';
import { FACES, type FaceValue } from './faces';

interface FaceScaleProps {
  question: string; // usado pelo leitor de tela para dizer a que pergunta as carinhas respondem
  value?: FaceValue; // carinha já escolhida, se houver
  onSelect: (value: FaceValue) => void;
}

// Carinhas de 1 a 5, sempre com o rótulo em texto (RN04, D1).
// Ficam uma embaixo da outra porque, em linha, o rótulo de 18 px não cabe no celular (guia, seção 4).
// Cada uma é um botão grande, de pelo menos 56 px de altura (README, seção 11).
export default function FaceScale({ question, value, onSelect }: FaceScaleProps) {
  return (
    <div role="group" aria-label={question} className="flex flex-col gap-2">
      {FACES.map((face) => {
        const selected = face.value === value;

        return (
          <button
            key={face.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(face.value)}
            className={[
              'flex min-h-16 w-full items-center gap-4 rounded-xl bg-white py-1.5 pr-4 pl-2 text-left text-xl font-bold',
              'transition-transform active:scale-[1.02]',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
              // Selecionado: contorno cinza escuro de 3 px e ✓, nunca só a cor (guia, seção 7)
              selected ? 'border-3 border-ink' : 'border-2 border-line',
            ].join(' ')}
          >
            <Face value={face.value} />
            {face.label}
            {selected && (
              <span aria-hidden="true" className="ml-auto text-2xl">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
