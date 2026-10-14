// Estilos dos botões e campos, seguindo o guia de estilos (docs/guia-de-estilos.md, seções 6 e 7).
const focus = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

// Botão primário: vermelho da FHDOD, texto branco.
export const primaryButton = [
  'min-h-12 rounded-xl px-4 font-bold',
  'bg-fhdod-red text-white active:bg-fhdod-red-dark',
  'disabled:bg-disabled disabled:text-muted',
  focus,
].join(' ');

// Botão secundário: fundo branco, borda e texto vermelho escuro (ações de apoio na gestão).
export const secondaryButton = [
  'min-h-12 rounded-xl border border-fhdod-red-dark bg-white px-4 font-bold text-fhdod-red-dark',
  'disabled:border-line disabled:text-muted',
  focus,
].join(' ');

export const input = `w-full rounded-xl border border-line bg-white px-3 py-3 ${focus}`;
