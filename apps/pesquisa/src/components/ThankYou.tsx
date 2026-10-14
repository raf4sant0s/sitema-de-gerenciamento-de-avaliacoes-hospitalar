// Tela de agradecimento: o fim da pesquisa (a resposta já virou COMPLETE, RN10).
export default function ThankYou() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div
        aria-hidden="true"
        className="flex h-26 w-26 items-center justify-center rounded-full bg-success text-6xl text-white"
      >
        ✓
      </div>
      <h1 className="text-[34px] font-bold">Obrigado!</h1>
      <p className="text-[22px] leading-snug">Sua opinião ajuda o hospital a melhorar.</p>
      <p className="text-muted">Você já pode fechar esta página.</p>
    </div>
  );
}
