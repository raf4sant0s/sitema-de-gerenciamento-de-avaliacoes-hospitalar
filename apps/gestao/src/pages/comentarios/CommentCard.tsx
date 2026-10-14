import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { type Comment, statusLabels, typeLabels, updateComment } from '../../api/comments';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';

// Data e hora no horário de Brasília, ex.: "14/10/2026 23:05".
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Um comentário anônimo (RN11) com o tratamento (RN17).
// Decisões da dupla: para marcar como tratado é obrigatório escrever o que foi feito;
// um tratado pode ser reaberto, e a anotação continua guardada.
export default function CommentCard({
  comment,
  canTreat,
  onChanged,
}: {
  comment: Comment;
  canTreat: boolean;
  onChanged: (comment: Comment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(comment.treatmentNote ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(status: Comment['status'], treatmentNote?: string) {
    setError('');
    setBusy(true);
    try {
      onChanged(await updateComment(comment.id, status, treatmentNote));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function handleTreat(event: FormEvent) {
    event.preventDefault();
    void send('TREATED', note.trim());
  }

  const treated = comment.status === 'TREATED';

  return (
    <li className={`rounded-xl border bg-white p-4 ${treated ? 'border-line' : 'border-fhdod-red-dark'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-muted">
        <span>
          {formatDateTime(comment.createdAt)} · {comment.sectorName}
        </span>
        <div className="flex flex-wrap gap-2">
          {comment.type && <span className="rounded-full border border-line px-3 py-1 font-bold text-ink">{typeLabels[comment.type]}</span>}
          {/* Situação com texto, não só cor (guia de estilos) */}
          <span className={`rounded-full px-3 py-1 font-bold ${treated ? 'bg-success text-white' : 'bg-fhdod-red text-white'}`}>
            {statusLabels[comment.status]}
          </span>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-lg">“{comment.text}”</p>

      {comment.treatmentNote && !editing && (
        <div className="mt-3 rounded-xl bg-page p-3">
          <p className="font-bold">O que foi feito</p>
          <p className="whitespace-pre-line">{comment.treatmentNote}</p>
          {comment.treatedBy && comment.treatedAt && (
            <p className="mt-1 text-muted">
              {comment.treatedBy.name} · {formatDateTime(comment.treatedAt)}
            </p>
          )}
          {!treated && <p className="mt-1 text-muted">Reaberto: a anotação acima é do tratamento anterior.</p>}
        </div>
      )}

      {canTreat && editing && (
        <form onSubmit={handleTreat} className="mt-3 flex flex-col gap-2">
          <label htmlFor={`note-${comment.id}`} className="font-bold">
            O que foi feito
          </label>
          <textarea
            id={`note-${comment.id}`}
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className={input}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !note.trim()} className={primaryButton}>
              {treated ? 'Salvar anotação' : 'Marcar como tratado'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(comment.treatmentNote ?? '');
                setEditing(false);
              }}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-3">
        <ErrorMessage message={error} />
      </div>

      {canTreat && !editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {treated ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
                Editar anotação
              </button>
              <button type="button" disabled={busy} onClick={() => send('NEW')} className={secondaryButton}>
                Reabrir
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={primaryButton}>
              Tratar
            </button>
          )}
        </div>
      )}
    </li>
  );
}
