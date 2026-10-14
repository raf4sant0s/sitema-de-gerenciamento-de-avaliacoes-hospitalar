import type { User } from '@avaliacoes/schemas';

// Contrato de acesso aos usuários: O QUE dá para fazer, sem dizer qual banco é.
// Os módulos (auth, users...) só conhecem esta interface.
// A implementação com o Supabase está em ../supabase/users.repository.ts.
export interface UsersRepository {
  // Devolve o usuário com esse e-mail, ou null se não existir.
  findByEmail(email: string): Promise<User | null>;
  // Devolve o usuário com esse id, ou null se não existir.
  findById(id: number): Promise<User | null>;
}
