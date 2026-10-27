import type { Role, User } from '@avaliacoes/schemas';

// Dados para criar um usuário. A senha já chega embaralhada (bcrypt), nunca em texto.
export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  sectorId: number | null;
}

// O que pode mudar num usuário. Campo que não vier fica como está.
export interface UserChanges {
  name?: string;
  email?: string;
  passwordHash?: string;
  role?: Role;
  sectorId?: number | null;
  active?: boolean;
}

// Contrato de acesso aos usuários: O QUE dá para fazer, sem dizer qual banco é.
// Os módulos (auth, users...) só conhecem esta interface.
// A implementação com o Supabase está em ../supabase/users.repository.ts.
export interface UsersRepository {
  // Devolve o usuário com esse e-mail (sem diferenciar maiúsculas), ou null se não existir.
  findByEmail(email: string): Promise<User | null>;
  // Devolve o usuário com esse id, ou null se não existir.
  findById(id: number): Promise<User | null>;
  // Lista todos, em ordem alfabética (só o super admin vê usuários, RN16).
  list(): Promise<User[]>;
  create(data: NewUser): Promise<User>;
  update(id: number, changes: UserChanges): Promise<User | null>;
}
