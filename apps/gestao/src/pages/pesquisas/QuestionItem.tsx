import type { JourneyStep } from '@avaliacoes/schemas';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { type Question, stepLabels, updateQuestion } from '../../api/surveys';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';

const steps = Object.keys(stepLabels) as JourneyStep[];

// Uma pergunta da pesquisa: subir/descer, editar texto e etapa, desativar (tarefa B13).
// A obrigatória (RN05) só tem o texto editável e fica sempre por último.
export default function QuestionItem({
  question,
  canMoveUp,
  canMoveDown,
  onMove,
  onChanged,
}: {
  question: Question;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onChanged: (question: Question) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.text);
  const [step, setStep] = useState<JourneyStep>(question.step);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(data: { text?: string; step?: JourneyStep; active?: boolean }) {
    setError('');
    setBusy(true);
    try {
      onChanged(await updateQuestion(question.id, data));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const textChanged = text.trim() !== question.text;
    // Decisão da dupla: pode corrigir o texto de pergunta já respondida, mas com aviso.
    if (
      textChanged &&
      question.answerCount > 0 &&
      !window.confirm(
        `Esta pergunta já recebeu ${question.answerCount} resposta(s). Elas foram dadas ao texto anterior. Mudar o texto mesmo assim?`,
      )
    ) {
      return;
    }
    void save(question.required ? { text: text.trim() } : { text: text.trim(), step });
  }

  return (
    <li className={`rounded-xl border bg-white p-4 ${question.required ? 'border-fhdod-red-dark' : 'border-line'}`}>
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label htmlFor={`text-${question.id}`} className="block font-bold">
              Pergunta
            </label>
            <input id={`text-${question.id}`} value={text} onChange={(event) => setText(event.target.value)} className={`mt-1 ${input}`} />
          </div>
          {!question.required && (
            <div>
              <label htmlFor={`step-${question.id}`} className="block font-bold">
                Etapa da jornada
              </label>
              <select
                id={`step-${question.id}`}
                value={step}
                onChange={(event) => setStep(event.target.value as JourneyStep)}
                className={`mt-1 ${input}`}
              >
                {steps.map((option) => (
                  <option key={option} value={option}>
                    {stepLabels[option]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !text.trim()} className={primaryButton}>
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setText(question.text);
                setStep(question.step);
                setEditing(false);
              }}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={`text-lg ${question.active ? '' : 'text-muted line-through'}`}>{question.text}</p>
          <p className="mt-1 text-muted">
            {question.required ? (
              <span className="font-bold text-fhdod-red-dark">Obrigatória · sempre a última</span>
            ) : (
              <>Etapa: {stepLabels[question.step]}</>
            )}
            {!question.active && <span className="font-bold"> · Desativada</span>}
            {question.answerCount > 0 && <> · {question.answerCount} resposta(s)</>}
          </p>
        </>
      )}

      <div className="mt-3">
        <ErrorMessage message={error} />
      </div>

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!question.required && (
            <>
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => onMove(-1)}
                aria-label={`Subir a pergunta "${question.text}"`}
                className={secondaryButton}
              >
                ↑ Subir
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => onMove(1)}
                aria-label={`Descer a pergunta "${question.text}"`}
                className={secondaryButton}
              >
                ↓ Descer
              </button>
            </>
          )}
          <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
            Editar
          </button>
          {!question.required && (
            <button type="button" disabled={busy} onClick={() => save({ active: !question.active })} className={secondaryButton}>
              {question.active ? 'Desativar' : 'Reativar'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
