import type { JourneyStep } from '@avaliacoes/schemas';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  createQuestion,
  getSurvey,
  listQuestions,
  type Question,
  reorderQuestions,
  stepLabels,
  type Survey,
  updateSurvey,
} from '../../api/surveys';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';
import QuestionItem from './QuestionItem';

const steps = Object.keys(stepLabels) as JourneyStep[];

// Tela /pesquisas/:id (README, seção 10): título e perguntas de uma pesquisa (tarefa B13).
// RN02: as perguntas aparecem para o paciente uma por tela, nesta ordem. RN05: a obrigatória é sempre a última.
export default function SurveyDetailPage() {
  const id = Number(useParams().id);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newStep, setNewStep] = useState<JourneyStep>('RECEPCAO');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getSurvey(id), listQuestions(id)])
      .then(([found, list]) => {
        setSurvey(found);
        setTitle(found.title);
        setQuestions(list);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a pesquisa.'))
      .finally(() => setLoading(false));
  }, [id]);

  const optional = questions.filter((question) => !question.required);
  const required = questions.filter((question) => question.required);

  async function run(action: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function saveTitle(event: FormEvent) {
    event.preventDefault();
    void run(async () => setSurvey(await updateSurvey(id, { title: title.trim() })));
  }

  function addQuestion(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const created = await createQuestion(id, newText.trim(), newStep);
      setQuestions([...optional, created, ...required]);
      setNewText('');
    });
  }

  // Troca a pergunta de lugar com a vizinha e grava a nova ordem na API.
  function move(index: number, direction: -1 | 1) {
    const ids = optional.map((question) => question.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    void run(async () => setQuestions(await reorderQuestions(id, ids)));
  }

  function replace(changed: Question) {
    setQuestions((list) => list.map((item) => (item.id === changed.id ? changed : item)));
  }

  if (loading) return <p className="text-muted">Carregando...</p>;
  if (!survey) return <ErrorMessage message={error || 'Pesquisa não encontrada.'} />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/pesquisas" className="text-fhdod-red-dark underline">
        ← Voltar para as pesquisas
      </Link>

      <form onSubmit={saveTitle} className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1">
          <label htmlFor="title" className="block font-bold">
            Título da pesquisa
          </label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className={`mt-1 ${input}`} />
        </div>
        <button type="submit" disabled={busy || !title.trim() || title.trim() === survey.title} className={secondaryButton}>
          Salvar título
        </button>
        <span className={`rounded-full px-3 py-1 font-bold ${survey.active ? 'bg-success text-white' : 'bg-disabled text-muted'}`}>
          {survey.active ? 'Ativa' : 'Inativa'}
        </span>
      </form>

      <ErrorMessage message={error} />

      <section aria-labelledby="questions-title">
        <h1 id="questions-title" className="text-2xl font-bold">
          Perguntas
        </h1>
        <p className="mt-1 text-muted">
          O paciente vê uma pergunta por tela, nesta ordem, sempre com carinhas de 1 a 5. A obrigatória é sempre a última.
          Perguntas desativadas não aparecem para o paciente.
        </p>

        <ol className="mt-4 flex flex-col gap-3">
          {optional.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              canMoveUp={!busy && index > 0}
              canMoveDown={!busy && index < optional.length - 1}
              onMove={(direction) => move(index, direction)}
              onChanged={replace}
            />
          ))}
          {required.map((question) => (
            <QuestionItem key={question.id} question={question} canMoveUp={false} canMoveDown={false} onMove={() => {}} onChanged={replace} />
          ))}
        </ol>
      </section>

      <form onSubmit={addQuestion} className="rounded-xl border border-line bg-white p-4" noValidate>
        <h2 className="text-xl font-bold">Nova pergunta</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="new-question" className="block font-bold">
              Pergunta
            </label>
            <input
              id="new-question"
              value={newText}
              onChange={(event) => setNewText(event.target.value)}
              placeholder="Ex.: Como foi o atendimento na recepção?"
              className={`mt-1 ${input}`}
            />
          </div>
          <div>
            <label htmlFor="new-step" className="block font-bold">
              Etapa da jornada
            </label>
            <select
              id="new-step"
              value={newStep}
              onChange={(event) => setNewStep(event.target.value as JourneyStep)}
              className={`mt-1 ${input}`}
            >
              {steps.map((option) => (
                <option key={option} value={option}>
                  {stepLabels[option]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={busy || !newText.trim()} className={`mt-4 ${primaryButton}`}>
          Adicionar pergunta
        </button>
      </form>
    </div>
  );
}
