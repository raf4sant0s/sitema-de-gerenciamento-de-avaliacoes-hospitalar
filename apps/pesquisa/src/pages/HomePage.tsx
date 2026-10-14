// Endereço sem setor (só "/"): a pesquisa sempre é aberta pelo QR Code ou pelo link de um setor (RN01).
export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="border-b-4 border-fhdod-red bg-white px-4 py-3">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-9" />
      </header>
      <main className="flex flex-1 flex-col justify-center gap-4 px-4 py-6">
        <h1 className="text-[28px] leading-tight font-bold">Pesquisa de satisfação</h1>
        <p className="text-muted">Para responder, leia o QR Code do setor onde você foi atendido.</p>
      </main>
    </div>
  );
}
