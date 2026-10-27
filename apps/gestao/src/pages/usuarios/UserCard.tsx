import type { Role } from '@avaliacoes/schemas';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client';
import type { Sector } from '../../api/sectors';
import { type User, type UserChanges, updateUser } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { roleLabels } from '../../auth/session';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { input, primaryButton, secondaryButton } from '../../components/ui/styles';
import UserFields from './UserFields';

type Mode = 'view' | 'edit' | 'password';

// Um usuário na lista, com editar, redefinir senha e ativar/desativar (tarefa B12).
export default function UserCard({
  user,
  sectors,
  onChanged,
}: {
  user: User;
  sectors: Sector[];
  onChanged: (user: User) => void;
}) {
  const { user: me } = useAuth();
  const isMe = me!.id === user.id;

  const [mode, setMode] = useState<Mode>('view');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [sectorId, setSectorId] = useState<number | null>(user.sectorId);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sectorName = sectors.find((sector) => sector.id === user.sectorId)?.name;

  async function save(changes: UserChanges) {
    setError('');
    setBusy(true);
    try {
      onChanged(await updateUser(user.id, changes));
      setMode('view');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    const changes: UserChanges = { name: name.trim(), email: email.trim() };
    // A própria pessoa não muda o próprio perfil nem setor (decisão da dupla)
    if (!isMe) {
      changes.role = role;
      changes.sectorId = role === 'SUPER_ADMIN' ? null : sectorId;
    }
    void save(changes);
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    void save({ password });
  }

  function toggleActive() {
    if (user.active && !window.confirm(`Desativar ${user.name}? A pessoa não vai mais conseguir entrar.`)) return;
    void save({ active: !user.active });
  }

  function cancel() {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setSectorId(user.sectorId);
    setPassword('');
    setError('');
    setMode('view');
  }

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">
            {user.name}
            {isMe && <span className="ml-2 font-normal text-muted">(você)</span>}
          </h2>
          <p className="break-all text-muted">{user.email}</p>
        </div>
        {/* Situação com texto, não só cor (guia de estilos) */}
        <span className={`rounded-full px-3 py-1 font-bold ${user.active ? 'bg-success text-white' : 'bg-disabled text-muted'}`}>
          {user.active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <p className="mt-2">
        <span className="font-bold">{roleLabels[user.role]}</span>
        {sectorName && <span className="text-muted"> · {sectorName}</span>}
      </p>

      {mode === 'edit' && (
        <form onSubmit={saveEdit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`name-${user.id}`} className="block font-bold">
              Nome
            </label>
            <input id={`name-${user.id}`} value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 ${input}`} />
          </div>
          <div>
            <label htmlFor={`email-${user.id}`} className="block font-bold">
              E-mail
            </label>
            <input
              id={`email-${user.id}`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`mt-1 ${input}`}
            />
          </div>
          {!isMe && (
            <UserFields
              idPrefix={`edit-${user.id}`}
              role={role}
              sectorId={sectorId}
              sectors={sectors}
              onRoleChange={setRole}
              onSectorChange={setSectorId}
            />
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" disabled={busy || !name.trim() || !email.trim()} className={primaryButton}>
              Salvar
            </button>
            <button type="button" onClick={cancel} className={secondaryButton}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === 'password' && (
        <form onSubmit={savePassword} className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label htmlFor={`password-${user.id}`} className="block font-bold">
              Nova senha
            </label>
            <input
              id={`password-${user.id}`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`mt-1 ${input}`}
            />
          </div>
          <button type="submit" disabled={busy || password.length < 8} className={primaryButton}>
            Salvar senha
          </button>
          <button type="button" onClick={cancel} className={secondaryButton}>
            Cancelar
          </button>
        </form>
      )}

      <div className="mt-3">
        <ErrorMessage message={error} />
      </div>

      {mode === 'view' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('edit')} className={secondaryButton}>
            Editar
          </button>
          {/* A própria senha é trocada em "Minha senha", conferindo a senha atual */}
          {!isMe && (
            <button type="button" onClick={() => setMode('password')} className={secondaryButton}>
              Redefinir senha
            </button>
          )}
          {/* Ninguém desativa a si mesmo (decisão da dupla) */}
          {!isMe && (
            <button type="button" disabled={busy} onClick={toggleActive} className={secondaryButton}>
              {user.active ? 'Desativar' : 'Reativar'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
