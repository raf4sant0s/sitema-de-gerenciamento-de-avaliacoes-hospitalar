// Mensagem de erro do guia de estilos: sempre com ícone e texto, nunca só a cor vermelha.
export default function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 text-error">
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </p>
  );
}
