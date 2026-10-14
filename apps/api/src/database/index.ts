import type { SectorsRepository } from './repositories/sectors.repository';
import type { UsersRepository } from './repositories/users.repository';
import { SupabaseSectorsRepository } from './supabase/sectors.repository';
import { SupabaseUsersRepository } from './supabase/users.repository';

// Aqui se escolhe QUAL banco a API usa. É o único lugar que liga as interfaces
// (repositories/) às implementações (supabase/).
// Para trocar de banco no futuro: criar outra pasta ao lado de supabase/ e mudar só este arquivo.

export interface Repositories {
  users: UsersRepository;
  sectors: SectorsRepository;
}

export function createRepositories(): Repositories {
  return {
    users: new SupabaseUsersRepository(),
    sectors: new SupabaseSectorsRepository(),
  };
}
