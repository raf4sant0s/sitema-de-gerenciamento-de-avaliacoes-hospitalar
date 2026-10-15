interface SkipLinkProps {
  onClick: () => void;
  children?: string;
  disabled?: boolean;
}

// Link "pular" das perguntas opcionais (RN07): discreto, pequeno, cinza, abaixo das carinhas.
// O texto é discreto, mas a área de toque continua com 56 px de altura (README, seção 11).
// A pergunta obrigatória NÃO usa este componente (RN05).
export default function SkipLink({ onClick, children = 'pular', disabled = false }: SkipLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mx-auto mt-4 min-h-14 px-6 text-muted underline focus-visible:outline-3 focus-visible:outline-ink short:mt-1 short:min-h-[56px]"
    >
      {children}
    </button>
  );
}
