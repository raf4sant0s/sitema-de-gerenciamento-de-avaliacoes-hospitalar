import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { listSectors, type Sector } from '../../api/sectors';
import { listUsers, type User } from '../../api/users';
import ErrorMessage from '../../components/ui/ErrorMessage';
import NewUserForm from './NewUserForm';
import UserCard from './UserCard';

// Tela /usuarios (README, seção 10): super admin e admin de setor (RN16; ver auth/menu.ts).
// O super admin vê todos; o admin de setor, só os visualizadores do seu setor (a API já filtra).
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listUsers(), listSectors()])
      .then(([userList, sectorList]) => {
        setUsers(userList);
        setSectors(sectorList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false));
  }, []);

  const sortByName = (list: User[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Usuários</h1>

      {!loading && <NewUserForm sectors={sectors} onCreated={(user) => setUsers((list) => sortByName([...list, user]))} />}

      {loading && <p className="text-muted">Carregando...</p>}
      <ErrorMessage message={error} />
      {!loading && !error && users.length === 0 && <p className="text-muted">Nenhum usuário cadastrado ainda.</p>}

      <ul className="flex flex-col gap-4" aria-label="Lista de usuários">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            sectors={sectors}
            onChanged={(changed) => setUsers((list) => sortByName(list.map((item) => (item.id === changed.id ? changed : item))))}
          />
        ))}
      </ul>
    </div>
  );
}
