import { useState } from 'react';
import { ApiError } from '../../api/client';
import { downloadSectorReport } from '../../api/dashboard';
import ErrorMessage from './ErrorMessage';
import { input, secondaryButton } from './styles';

// Mês atual no formato "AAAA-MM".
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// "Baixar relatório" do setor em PDF, de um mês escolhido (RN23). Usado no dashboard e na aba Setores.
// Sem setor (super admin no hospital todo), o botão fica desligado e explica o porquê.
export default function SectorReportDownload({ sector, idPrefix }: { sector?: { id: number; slug: string }; idPrefix: string }) {
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (!sector) return;
    setBusy(true);
    setError('');
    try {
      await downloadSectorReport(sector, month);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={`${idPrefix}-month`} className="flex flex-col gap-1 font-bold text-muted">
          Mês do relatório
          <input
            id={`${idPrefix}-month`}
            type="month"
            className={input}
            value={month}
            max={currentMonth()}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button type="button" className={secondaryButton} onClick={handleDownload} disabled={!sector || !month || busy}>
          <span aria-hidden="true">⭳ </span>
          {busy ? 'Gerando...' : 'Baixar relatório (PDF)'}
        </button>
      </div>
      {!sector && <p className="text-muted">Escolha um setor nos filtros para baixar o relatório dele.</p>}
      <ErrorMessage message={error} />
    </div>
  );
}
