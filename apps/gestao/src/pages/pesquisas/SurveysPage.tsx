import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { listSectors, type Sector } from '../../api/sectors';
import { createSurvey, listSurveys, type Survey, updateSurvey } from '../../api/surveys';
import { useAuth } from '../../auth/AuthContext';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';

// Tela /pesquisas (README, seção 10): super admin (todos os setores) e admin de setor (o seu).
// Decisões da dupla: a pesquisa nasce desativada e já com a pergunta obrigatória;
// ativar uma pesquisa desativa a que estava ativa no mesmo setor (RN02).
export default function SurveysPage() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [sectorId, setSectorId] = useState<number | null>(user!.role === 'SUPER_ADMIN' ? null : user!.sectorId);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([listSurveys(), listSectors()])
      .then(([surveyList, sectorList]) => {
        setSurveys(surveyList);
        setSectors(sectorList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as pesquisas.'))
      .finally(() => setLoading(false));
  }, []);

  const sectorName = (id: number) => sectors.find((sector) => sector.id === id)?.name ?? '';

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (sectorId === null) return;
    setError('');
    setSending(true);
    try {
      const survey = await createSurvey(sectorId, title.trim());
      setSurveys((list) => [survey, ...list]);
      setTitle('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a pesquisa.');
    } finally {
      setSending(false);
    }
  }

  async function toggleActive(survey: Survey) {
    if (!survey.active) {
      const current = surveys.find((item) => item.sectorId === survey.sectorId && item.active);
      const warning = current
        ? `Ativar "${survey.title}"? A pesquisa "${current.title}" vai ser desativada, porque cada setor tem só uma pesquisa ativa.`
        : `Ativar "${survey.title}"? Ela passa a aparecer para os pacientes do setor.`;
      if (!window.confirm(warning)) return;
    } else if (!window.confirm(`Desativar "${survey.title}"? O setor fica sem pesquisa até outra ser ativada.`)) {
      return;
    }

    setError('');
    try {
      const changed = await updateSurvey(survey.id, { active: !survey.active });
      // Ao ativar, a antiga do mesmo setor ficou desativada na API: reflete isso na lista.
      setSurveys((list) =>
        list.map((item) => {
          if (item.id === changed.id) return changed;
          if (changed.active && item.sectorId === changed.sectorId) return { ...item, active: false };
          return item;
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível alterar a pesquisa.');
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Pesquisas</h1>

      <form onSubmit={handleCreate} className="rounded-xl border border-line bg-white p-4" noValidate>
        <h2 className="text-xl font-bold">Nova pesquisa</h2>
        <p className="mt-1 text-muted">
          A pesquisa nasce desativada e já com a pergunta obrigatória. Cadastre as perguntas e depois ative.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="survey-title" className="block font-bold">
              Título
            </label>
            <input
              id="survey-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Pesquisa do Pronto Atendimento"
              className={`mt-1 ${input}`}
            />
          </div>
          <div>
            <label htmlFor="survey-sector" className="block font-bold">
              Setor
            </label>
            <select
              id="survey-sector"
              value={sectorId ?? ''}
              disabled={user!.role !== 'SUPER_ADMIN'}
              onChange={(event) => setSectorId(event.target.value ? Number(event.target.value) : null)}
              className={`mt-1 ${input}`}
            >
              <option value="">Escolha o setor</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={sending || !title.trim() || sectorId === null} className={`mt-4 ${primaryButton}`}>
          {sending ? 'Criando...' : 'Criar pesquisa'}
        </button>
      </form>

      {loading && <p className="text-muted">Carregando...</p>}
      <ErrorMessage message={error} />
      {!loading && !error && surveys.length === 0 && <p className="text-muted">Nenhuma pesquisa cadastrada ainda.</p>}

      <ul className="flex flex-col gap-4" aria-label="Lista de pesquisas">
        {surveys.map((survey) => (
          <li key={survey.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{survey.title}</h2>
                <p className="text-muted">{sectorName(survey.sectorId)}</p>
              </div>
              {/* Situação com texto, não só cor (guia de estilos) */}
              <span className={`rounded-full px-3 py-1 font-bold ${survey.active ? 'bg-success text-white' : 'bg-disabled text-muted'}`}>
                {survey.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/pesquisas/${survey.id}`} className={`inline-flex items-center ${secondaryButton}`}>
                Editar perguntas
              </Link>
              <button type="button" onClick={() => toggleActive(survey)} className={secondaryButton}>
                {survey.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
