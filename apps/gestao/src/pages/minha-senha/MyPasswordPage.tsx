import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import { changeMyPassword } from '../../api/users';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton } from '../../components/ui/styles';

// Tela /minha-senha (tarefa B12): qualquer perfil troca a própria senha, confirmando a atual.
// Decisão da dupla: assim a senha inicial, que o admin conhece, deixa de valer.
export default function MyPasswordPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setDone(false);

    if (next !== repeat) {
      setError('A nova senha e a confirmação estão diferentes.');
      return;
    }

    setSending(true);
    try {
      await changeMyPassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setRepeat('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, autoComplete: string) => (
    <div>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 ${input}`}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Minha senha</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-white p-4" noValidate>
        {field('current-password', 'Senha atual', current, setCurrent, 'current-password')}
        {field('new-password', 'Nova senha', next, setNext, 'new-password')}
        <p className="-mt-2 text-muted">Pelo menos 8 caracteres.</p>
        {field('repeat-password', 'Repita a nova senha', repeat, setRepeat, 'new-password')}

        <ErrorMessage message={error} />
        {/* Sucesso com ícone e texto, não só a cor verde */}
        {done && (
          <p role="status" className="flex items-start gap-2 text-success">
            <span aria-hidden="true">✓</span>
            <span>Senha trocada. Use a nova senha da próxima vez que entrar.</span>
          </p>
        )}

        <button type="submit" disabled={sending || !current || next.length < 8 || !repeat} className={primaryButton}>
          {sending ? 'Salvando...' : 'Trocar senha'}
        </button>
      </form>
    </div>
  );
}
