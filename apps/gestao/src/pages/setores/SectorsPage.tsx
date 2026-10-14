import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { listSectors, type Sector } from '../../api/sectors';
import NewSectorForm from './NewSectorForm';
import SectorCard from './SectorCard';

// Tela /setores (README, seção 10): só o super admin abre (RN16; ver auth/menu.ts).
// Cria setores, mostra os links e o código, baixa os QR Codes (RN01) e ativa/desativa.
export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listSectors()
      .then(setSectors)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os setores.'))
      .finally(() => setLoading(false));
  }, []);

  function sortByName(list: Sector[]) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Setores</h1>

      <NewSectorForm onCreated={(sector) => setSectors((list) => sortByName([...list, sector]))} />

      {loading && <p className="text-muted">Carregando...</p>}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      {!loading && !error && sectors.length === 0 && <p className="text-muted">Nenhum setor cadastrado ainda.</p>}

      <ul className="flex flex-col gap-4" aria-label="Lista de setores">
        {sectors.map((sector) => (
          <SectorCard
            key={sector.id}
            sector={sector}
            onChanged={(changed) => setSectors((list) => sortByName(list.map((item) => (item.id === changed.id ? changed : item))))}
          />
        ))}
      </ul>
    </div>
  );
}
