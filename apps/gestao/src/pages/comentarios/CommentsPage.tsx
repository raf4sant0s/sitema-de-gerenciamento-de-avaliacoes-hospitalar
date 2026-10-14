import type { CommentStatus, CommentType } from '@avaliacoes/schemas';
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { type Comment, type CommentFilters, listComments, PAGE_SIZE, statusLabels, typeLabels } from '../../api/comments';
import { listSectors, type Sector } from '../../api/sectors';
import { useAuth } from '../../auth/AuthContext';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, secondaryButton } from '../../components/ui/styles';
import CommentCard from './CommentCard';

// Tela /comentarios (README, seção 10; tarefa B15): comentários anônimos dos pacientes (RN11).
// Todos os perfis leem os do próprio setor (o super admin vê todos); os admins tratam (RN16, RN17).
export default function CommentsPage() {
  const { user } = useAuth();
  const isSuper = user!.role === 'SUPER_ADMIN';
  const canTreat = user!.role !== 'VIEWER';

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [filters, setFilters] = useState<CommentFilters>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSuper) listSectors().then(setSectors).catch(() => setSectors([]));
  }, [isSuper]);

  // Recarrega do começo sempre que um filtro muda.
  useEffect(() => {
    setLoading(true);
    setError('');
    listComments(filters)
      .then((page) => {
        setComments(page.items);
        setTotal(page.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os comentários.'))
      .finally(() => setLoading(false));
  }, [filters]);

  async function loadMore() {
    setLoading(true);
    try {
      const page = await listComments(filters, comments.length);
      setComments((list) => [...list, ...page.items]);
      setTotal(page.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar mais comentários.');
    } finally {
      setLoading(false);
    }
  }

  function setFilter<K extends keyof CommentFilters>(key: K, value: CommentFilters[K] | '') {
    setFilters((current) => ({ ...current, [key]: value === '' ? undefined : value }));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Comentários</h1>
      <p className="-mt-4 text-muted">Comentários anônimos deixados pelos pacientes no fim da pesquisa.</p>

      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 md:grid-cols-3">
        <legend className="px-1 font-bold">Filtros</legend>
        {isSuper && (
          <div>
            <label htmlFor="filter-sector" className="block font-bold">
              Setor
            </label>
            <select
              id="filter-sector"
              value={filters.sectorId ?? ''}
              onChange={(event) => setFilter('sectorId', event.target.value ? Number(event.target.value) : '')}
              className={`mt-1 ${input}`}
            >
              <option value="">Todos os setores</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="filter-status" className="block font-bold">
            Situação
          </label>
          <select
            id="filter-status"
            value={filters.status ?? ''}
            onChange={(event) => setFilter('status', event.target.value as CommentStatus | '')}
            className={`mt-1 ${input}`}
          >
            <option value="">Todas</option>
            {(Object.keys(statusLabels) as CommentStatus[]).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-type" className="block font-bold">
            Tipo
          </label>
          <select
            id="filter-type"
            value={filters.type ?? ''}
            onChange={(event) => setFilter('type', event.target.value as CommentType | '')}
            className={`mt-1 ${input}`}
          >
            <option value="">Todos</option>
            {(Object.keys(typeLabels) as CommentType[]).map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-from" className="block font-bold">
            De
          </label>
          <input
            id="filter-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => setFilter('from', event.target.value)}
            className={`mt-1 ${input}`}
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="block font-bold">
            Até
          </label>
          <input
            id="filter-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => setFilter('to', event.target.value)}
            className={`mt-1 ${input}`}
          />
        </div>
      </fieldset>

      <ErrorMessage message={error} />
      {!error && !loading && (
        <p className="text-muted" aria-live="polite">
          {total === 0 ? 'Nenhum comentário com esses filtros.' : `${total} comentário(s)`}
        </p>
      )}

      <ul className="flex flex-col gap-4" aria-label="Lista de comentários">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            canTreat={canTreat}
            onChanged={(changed) => setComments((list) => list.map((item) => (item.id === changed.id ? changed : item)))}
          />
        ))}
      </ul>

      {loading && <p className="text-muted">Carregando...</p>}
      {!loading && comments.length < total && (
        <button type="button" onClick={loadMore} className={`self-center ${secondaryButton}`}>
          Carregar mais ({Math.min(PAGE_SIZE, total - comments.length)})
        </button>
      )}
    </div>
  );
}
