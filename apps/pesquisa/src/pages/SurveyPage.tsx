import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  completeResponse,
  getSurveyBySlug,
  saveAnswer,
  sendComment,
  startResponse,
  type CommentType,
  type JourneyStep,
  type PublicSurvey,
} from '../api/survey';
import CommentForm from '../components/CommentForm';
import FaceScale from '../components/FaceScale';
import QuestionTitle from '../components/QuestionTitle';
import SkipLink from '../components/SkipLink';
import SurveyFrame from '../components/SurveyFrame';
import ThankYou from '../components/ThankYou';
import type { FaceValue } from '../components/faces';

// Nome de cada etapa da jornada (RN06), mostrado acima da pergunta. Nunca "pergunta 3 de 10" (RN03).
const STEP_LABELS: Record<JourneyStep, string> = {
  RECEPCAO: 'Recepção',
  TRIAGEM: 'Triagem',
  ENFERMAGEM: 'Enfermagem',
  MEDICO: 'Médico',
  GERAL: 'Geral',
};

// Tempo para o paciente ver o ✓ na carinha escolhida antes de a tela avançar sozinha (D7).
export const ADVANCE_DELAY_MS = 400;

const SAVE_ERROR = 'Não foi possível salvar. Confira a internet e toque de novo.';

type Phase = 'loading' | 'not-found' | 'load-error' | 'questions' | 'comment' | 'thanks';

// Pesquisa do setor, aberta pelo link /avaliacao/<slug> (ex.: /avaliacao/pronto-atendimento) (RN01).
// Ordem das telas (README, seção 10): perguntas opcionais, uma por tela (RN02) → obrigatória por último (RN05)
// → comentário, que sempre aparece (RN11) → agradecimento.
export default function SurveyPage() {
  const { slug } = useParams();

  const [data, setData] = useState<PublicSurvey | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, FaceValue>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // RN09: o id da resposta só existe depois do primeiro toque
  const responseId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSurveyBySlug(slug ?? '')
      .then((survey) => {
        if (cancelled) return;
        setData(survey);
        setPhase('questions');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase(err instanceof ApiError && err.status === 404 ? 'not-found' : 'load-error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const questions = data?.survey.questions ?? [];
  const question = questions[index];

  function goToNext() {
    setError('');
    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      setPhase('comment');
    }
  }

  // RN09: o primeiro toque cria a resposta; os seguintes salvam na hora.
  async function handleSelect(value: FaceValue) {
    if (!data || !question || busy) return;
    setBusy(true);
    setError('');
    setAnswers((current) => ({ ...current, [question.id]: value }));

    try {
      if (responseId.current) {
        await saveAnswer(responseId.current, question.id, value);
      } else {
        responseId.current = await startResponse({
          sectorId: data.sector.id,
          surveyId: data.survey.id,
          questionId: question.id,
          value,
        });
      }
      // Mostra o ✓ por um instante e avança sozinha: não existe botão "próximo" (D7).
      setTimeout(() => {
        setBusy(false);
        goToNext();
      }, ADVANCE_DELAY_MS);
    } catch {
      setAnswers((current) => {
        const { [question.id]: _removed, ...rest } = current;
        return rest;
      });
      setError(SAVE_ERROR);
      setBusy(false);
    }
  }

  // Fim: salva o comentário (se houver) e marca a resposta como COMPLETE (RN10).
  async function finish(comment?: { type: CommentType | null; text: string }) {
    if (!responseId.current || busy) return;
    setBusy(true);
    setError('');
    try {
      if (comment) await sendComment(responseId.current, comment);
      await completeResponse(responseId.current);
      setPhase('thanks');
    } catch {
      setError(SAVE_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const sectorName = data?.sector.name ?? '';

  if (phase === 'loading') {
    return (
      <SurveyFrame sectorName="">
        <p className="text-muted">Carregando a pesquisa…</p>
      </SurveyFrame>
    );
  }

  if (phase === 'not-found' || phase === 'load-error') {
    return (
      <SurveyFrame sectorName="">
        <h1 className="mb-4 text-[28px] leading-tight font-bold">
          {phase === 'not-found' ? 'Pesquisa não encontrada' : 'Não foi possível abrir a pesquisa'}
        </h1>
        <p className="text-muted">
          {phase === 'not-found'
            ? 'Confira o link ou leia de novo o QR Code do setor.'
            : 'Confira a internet e tente abrir o link de novo.'}
        </p>
      </SurveyFrame>
    );
  }

  if (phase === 'thanks') {
    return (
      <SurveyFrame sectorName={sectorName}>
        <ThankYou />
      </SurveyFrame>
    );
  }

  return (
    <SurveyFrame sectorName={sectorName}>
      {phase === 'comment' ? (
        <CommentForm onSend={(comment) => finish(comment)} onSkip={() => finish()} busy={busy} />
      ) : (
        question && (
          <>
            <QuestionTitle step={question.required ? 'Avaliação geral' : STEP_LABELS[question.step]} text={question.text} />
            <FaceScale
              key={question.id}
              question={question.text}
              value={answers[question.id]}
              onSelect={handleSelect}
              disabled={busy}
            />
            {/* RN05/RN07: só as opcionais têm "pular" */}
            {!question.required && <SkipLink onClick={goToNext} disabled={busy} />}
          </>
        )
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-error bg-white p-3 font-bold text-error">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </SurveyFrame>
  );
}
