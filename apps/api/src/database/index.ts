import type { ResponsesRepository } from './repositories/responses.repository';
import type { SchedulesRepository } from './repositories/schedules.repository';
import type { SectorsRepository } from './repositories/sectors.repository';
import type { SurveysRepository } from './repositories/surveys.repository';
import type { UsersRepository } from './repositories/users.repository';
import { SupabaseResponsesRepository } from './supabase/responses.repository';
import { SupabaseSchedulesRepository } from './supabase/schedules.repository';
import { SupabaseSectorsRepository } from './supabase/sectors.repository';
import { SupabaseSurveysRepository } from './supabase/surveys.repository';
import { SupabaseUsersRepository } from './supabase/users.repository';

// Aqui se escolhe QUAL banco a API usa. É o único lugar que liga as interfaces
// (repositories/) às implementações (supabase/).
// Para trocar de banco no futuro: criar outra pasta ao lado de supabase/ e mudar só este arquivo.

export interface Repositories {
  users: UsersRepository;
  sectors: SectorsRepository;
  surveys: SurveysRepository;
  schedules: SchedulesRepository;
  responses: ResponsesRepository; // pesquisa do paciente (A)
}

export function createRepositories(): Repositories {
  return {
    users: new SupabaseUsersRepository(),
    sectors: new SupabaseSectorsRepository(),
    surveys: new SupabaseSurveysRepository(),
    schedules: new SupabaseSchedulesRepository(),
    responses: new SupabaseResponsesRepository(),
  };
}
