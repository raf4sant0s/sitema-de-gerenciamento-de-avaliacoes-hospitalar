import type { ReactNode } from 'react';

interface SurveyFrameProps {
  sectorName: string;
  children: ReactNode;
}

// Moldura de todas as telas da pesquisa: logo pequeno no topo (README, seção 11),
// nome do setor e o aviso de que a pesquisa é anônima (RN08, D3).
// Não mostra contador nem barra de progresso (RN03).
export default function SurveyFrame({ sectorName, children }: SurveyFrameProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="flex items-center justify-between border-b-4 border-fhdod-red bg-white px-4 py-3 short:py-2">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-9 short:h-8" />
        <span className="text-right leading-tight text-muted">{sectorName}</span>
      </header>
      <main className="flex flex-1 flex-col px-4 pt-6 pb-4 short:pt-3 short:pb-2">{children}</main>
      <footer className="px-4 pb-4 text-center text-muted short:pb-2">
        <span aria-hidden="true">🔒</span> Pesquisa anônima
      </footer>
    </div>
  );
}
