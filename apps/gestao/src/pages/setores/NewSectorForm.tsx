import { slugify } from '@avaliacoes/schemas';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { createSector, type Sector } from '../../api/sectors';
import { input, primaryButton } from '../../components/ui/styles';

// Formulário "Novo setor" (tarefa B11).
// Decisão da dupla: o link nasce do nome e pode ser ajustado antes de salvar; depois não muda mais.
export default function NewSectorForm({ onCreated }: { onCreated: (sector: Sector) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // Enquanto a pessoa não mexer no link, ele acompanha o nome.
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  function changeName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const sector = await createSector(name.trim(), slug);
      onCreated(sector);
      setName('');
      setSlug('');
      setSlugEdited(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o setor. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-white p-4" noValidate>
      <h2 className="text-xl font-bold">Novo setor</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="sector-name" className="block font-bold">
            Nome do setor
          </label>
          <input
            id="sector-name"
            value={name}
            onChange={(event) => changeName(event.target.value)}
            placeholder="Ex.: Pronto Atendimento"
            className={`mt-1 ${input}`}
          />
        </div>

        <div>
          <label htmlFor="sector-slug" className="block font-bold">
            Link da pesquisa
          </label>
          <input
            id="sector-slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            aria-describedby="sector-slug-help"
            className={`mt-1 ${input}`}
          />
          <p id="sector-slug-help" className="mt-1 text-muted">
            Gerado a partir do nome. Pode ajustar agora; depois de criado, o link não muda, porque ele vai impresso no QR
            Code.
          </p>
        </div>
      </div>

      {/* Guia de estilos: erro sempre com ícone e texto */}
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <button type="submit" disabled={sending || !name.trim() || !slug} className={`mt-4 ${primaryButton}`}>
        {sending ? 'Criando...' : 'Criar setor'}
      </button>
    </form>
  );
}
