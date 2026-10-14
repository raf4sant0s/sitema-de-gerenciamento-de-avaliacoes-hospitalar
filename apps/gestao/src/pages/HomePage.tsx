// Página provisória (tarefa A6): só prova que o site roda com as cores e a fonte do guia.
// Será substituída pelo login (Pessoa B) e pelo dashboard (Pessoa A).
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b-4 border-fhdod-red bg-white px-6">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-9" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-2xl font-bold">Gestão</h1>
        <p className="text-muted">Site em construção.</p>
      </main>
    </div>
  );
}
