import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

// Tela de login do site de gestão (README, seção 10).
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Se a pessoa tentou abrir uma tela antes de entrar, volta para ela depois do login.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSending(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // A API já devolve a mensagem em português ("E-mail ou senha incorretos").
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-line bg-white p-6" noValidate>
        <img src="/logo-fhdod.png" alt="FHDOD" className="mx-auto h-12" />
        <h1 className="mt-4 text-center text-2xl font-bold">Gestão</h1>

        <label htmlFor="email" className="mt-6 block font-bold">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3 py-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
          required
        />

        <label htmlFor="password" className="mt-4 block font-bold">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3 py-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
          required
        />

        {/* Guia de estilos: erro sempre com ícone e texto, nunca só a cor */}
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-error">
            <span aria-hidden="true">⚠</span>
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={sending || !email || !password}
          className={[
            'mt-6 min-h-14 w-full rounded-xl px-4 font-bold',
            'bg-fhdod-red text-white active:bg-fhdod-red-dark',
            'disabled:bg-disabled disabled:text-muted',
            'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
          ].join(' ')}
        >
          {sending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
