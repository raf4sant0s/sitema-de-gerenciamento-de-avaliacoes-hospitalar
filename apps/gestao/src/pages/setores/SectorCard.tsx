import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { downloadQrCode, type Sector, updateSector } from '../../api/sectors';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';

// Um setor na lista: links, código, situação e ações (tarefa B11).
export default function SectorCard({ sector, onChanged }: { sector: Sector; onChanged: (sector: Sector) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sector.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      onChanged(await updateSector(sector.id, { name: name.trim() }));
      setEditing(false);
    });
  }

  function toggleActive() {
    // Desativar faz a pesquisa do setor parar de abrir: pede confirmação antes.
    if (sector.active && !window.confirm(`Desativar o setor "${sector.name}"? A pesquisa dele vai parar de abrir.`)) {
      return;
    }
    void run(async () => onChanged(await updateSector(sector.id, { active: !sector.active })));
  }

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {editing ? (
          <form onSubmit={saveName} className="flex w-full flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label htmlFor={`name-${sector.id}`} className="block font-bold">
                Nome do setor
              </label>
              <input
                id={`name-${sector.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`mt-1 ${input}`}
              />
            </div>
            <button type="submit" disabled={busy || !name.trim()} className={primaryButton}>
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setName(sector.name);
                setEditing(false);
              }}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </form>
        ) : (
          <h2 className="text-xl font-bold">{sector.name}</h2>
        )}

        {!editing && (
          // Situação com texto, não só cor (guia de estilos)
          <span
            className={`rounded-full px-3 py-1 font-bold ${sector.active ? 'bg-success text-white' : 'bg-disabled text-muted'}`}
          >
            {sector.active ? 'Ativo' : 'Inativo'}
          </span>
        )}
      </div>

      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <dt className="text-muted">Link da pesquisa</dt>
          <dd className="break-all">
            <a href={sector.surveyUrl} target="_blank" rel="noreferrer" className="text-fhdod-red-dark underline">
              {sector.surveyUrl}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Código curto</dt>
          <dd>
            <span className="font-bold tracking-widest">{sector.code}</span>
            <span className="ml-2 break-all text-muted">({sector.shortUrl})</span>
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => downloadQrCode(sector, 'slug'))} className={secondaryButton}>
          Baixar QR Code do link
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => downloadQrCode(sector, 'code'))} className={secondaryButton}>
          Baixar QR Code do código
        </button>
        {!editing && (
          <button type="button" disabled={busy} onClick={() => setEditing(true)} className={secondaryButton}>
            Editar nome
          </button>
        )}
        <button type="button" disabled={busy} onClick={toggleActive} className={secondaryButton}>
          {sector.active ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </li>
  );
}
