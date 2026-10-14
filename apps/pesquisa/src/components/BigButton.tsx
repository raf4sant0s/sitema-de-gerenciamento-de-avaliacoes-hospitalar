import type { ButtonHTMLAttributes } from 'react';

// Botão principal da pesquisa: vermelho da FHDOD, largura total e pelo menos 56 px de altura.
// Estados do guia (seção 7): normal, tocado (vermelho escuro), desabilitado (cinza) e foco.
export default function BigButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[
        'min-h-14 w-full rounded-xl px-4 text-xl font-bold',
        'bg-fhdod-red text-white active:bg-fhdod-red-dark',
        'disabled:bg-disabled disabled:text-muted',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
