import type { Role } from '@avaliacoes/schemas';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import type { Sector } from '../../api/sectors';
import { createUser, type User } from '../../api/users';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton } from '../../components/ui/styles';
import UserFields from './UserFields';

// Formulário "Novo usuário" (tarefa B12).
// Decisão da dupla: quem cadastra digita a senha inicial e passa para a pessoa,
// que depois troca em "Minha senha".
export default function NewUserForm({ sectors, onCreated }: { sectors: Sector[]; onCreated: (user: User) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const needsSector = role !== 'SUPER_ADMIN';
  const canSend = name.trim() && email.trim() && password.length >= 8 && (!needsSector || sectorId !== null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const created = await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        sectorId: needsSector ? sectorId : null,
      });
      onCreated(created);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-white p-4" noValidate>
      <h2 className="text-xl font-bold">Novo usuário</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="new-name" className="block font-bold">
            Nome
          </label>
          <input id="new-name" value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 ${input}`} />
        </div>
        <div>
          <label htmlFor="new-email" className="block font-bold">
            E-mail
          </label>
          <input
            id="new-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`mt-1 ${input}`}
          />
        </div>

        <UserFields
          idPrefix="new"
          role={role}
          sectorId={sectorId}
          sectors={sectors}
          onRoleChange={setRole}
          onSectorChange={setSectorId}
        />

        <div>
          <label htmlFor="new-password" className="block font-bold">
            Senha inicial
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="new-password-help"
            className={`mt-1 ${input}`}
          />
          <p id="new-password-help" className="mt-1 text-muted">
            Pelo menos 8 caracteres. Passe para a pessoa; ela troca em "Minha senha".
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ErrorMessage message={error} />
      </div>

      <button type="submit" disabled={sending || !canSend} className={`mt-4 ${primaryButton}`}>
        {sending ? 'Cadastrando...' : 'Cadastrar usuário'}
      </button>
    </form>
  );
}
