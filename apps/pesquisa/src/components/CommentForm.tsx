import { useState } from 'react';
import type { CommentType } from '../api/survey';
import BigButton from './BigButton';
import SkipLink from './SkipLink';

const TYPES: { value: CommentType; label: string }[] = [
  { value: 'ELOGIO', label: 'Elogio' },
  { value: 'RECLAMACAO', label: 'Reclamação' },
  { value: 'SUGESTAO', label: 'Sugestão' },
];

interface CommentFormProps {
  onSend: (comment: { type: CommentType | null; text: string }) => void;
  onSkip: () => void;
  busy?: boolean;
}

// Tela de comentário (RN11): aparece para todos, depois da pergunta obrigatória.
// Tudo é opcional: o tipo, o texto e a própria tela ("seguir sem comentar").
// Não pede nenhum dado pessoal (RN08, D3).
export default function CommentForm({ onSend, onSkip, busy = false }: CommentFormProps) {
  const [type, setType] = useState<CommentType | null>(null);
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;

  return (
    <>
      <h1 className="mb-2 text-[28px] leading-tight font-bold">Quer contar mais alguma coisa?</h1>
      <p className="mb-4 text-muted">É opcional. Não pedimos seu nome nem nenhum dado seu.</p>

      <p className="mb-2 font-bold">Escolha um tipo, se quiser:</p>
      <div role="group" aria-label="Tipo do comentário" className="mb-4 flex flex-col gap-2">
        {TYPES.map((option) => {
          const selected = option.value === type;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              // Tocar de novo no tipo escolhido desmarca
              onClick={() => setType(selected ? null : option.value)}
              className={[
                'flex min-h-14 items-center rounded-xl bg-white px-4 text-left font-bold',
                'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
                selected ? 'border-3 border-ink' : 'border-2 border-line',
              ].join(' ')}
            >
              {option.label}
              {selected && (
                <span aria-hidden="true" className="ml-auto text-2xl">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <label htmlFor="comment-text" className="mb-2 block font-bold">
        Seu comentário:
      </label>
      <textarea
        id="comment-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={2000}
        rows={4}
        className="w-full resize-none rounded-xl border-2 border-line bg-white p-3 focus-visible:outline-3 focus-visible:outline-ink"
      />

      <BigButton className="mt-4" disabled={!hasText || busy} onClick={() => onSend({ type, text: text.trim() })}>
        Enviar
      </BigButton>
      <SkipLink onClick={onSkip} disabled={busy}>
        seguir sem comentar
      </SkipLink>
    </>
  );
}
