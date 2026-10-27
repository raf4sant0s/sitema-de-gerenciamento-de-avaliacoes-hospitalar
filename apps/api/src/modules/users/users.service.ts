import type { Role, User } from '@avaliacoes/schemas';
import bcrypt from 'bcryptjs';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import type { UserChanges, UsersRepository } from '../../database/repositories/users.repository';
import type { AuthUser } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// O que a API devolve sobre um usuário (README, seção 9). Nunca a senha, nem embaralhada.
export interface UserView {
  id: number;
  name: string;
  email: string;
  role: Role;
  sectorId: number | null;
  active: boolean;
  createdAt: string;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sectorId: user.sector_id,
    active: user.active,
    createdAt: user.created_at.toISOString(),
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  sectorId: number | null;
}

export type UpdateUserInput = Partial<CreateUserInput> & { active?: boolean };

// Regras dos usuários do site de gestão (tarefa B12; RN16).
// - Só o super admin mexe em usuários (a rota já barra os outros perfis; ajuste de 27/10/2026).
// - Ele cadastra qualquer perfil, inclusive outro super admin (decisão da dupla).
// - Ninguém desativa a si mesmo nem muda o próprio perfil ou setor (decisão da dupla).
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sectors: SectorsRepository,
  ) {}

  async list(): Promise<UserView[]> {
    return (await this.users.list()).map(toUserView);
  }

  async create(input: CreateUserInput): Promise<UserView> {
    const data = this.applyRoleRules(input.role, input.sectorId);
    await this.checkSectorExists(data.sectorId);
    await this.checkEmailFree(input.email);

    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: data.role,
      sectorId: data.sectorId,
    });
    return toUserView(user);
  }

  async update(me: AuthUser, id: number, input: UpdateUserInput): Promise<UserView> {
    const target = await this.users.findById(id);
    if (!target) throw this.notFound();
    const isMe = target.id === me.id;

    // Proteção contra se trancar para fora (decisão da dupla).
    if (isMe && input.active === false) {
      throw new AppError(403, 'FORBIDDEN', 'Você não pode desativar a sua própria conta');
    }
    if (isMe && (input.role !== undefined && input.role !== target.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Você não pode mudar o seu próprio perfil');
    }
    if (isMe && input.sectorId !== undefined && input.sectorId !== target.sector_id) {
      throw new AppError(403, 'FORBIDDEN', 'Você não pode mudar o seu próprio setor');
    }

    const changes: UserChanges = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.active !== undefined) changes.active = input.active;

    if (input.email !== undefined && input.email.toLowerCase() !== target.email.toLowerCase()) {
      await this.checkEmailFree(input.email);
      changes.email = input.email;
    }

    // Redefinir a senha de outra pessoa (o próprio usuário troca a dele em PUT /auth/password).
    if (input.password !== undefined) {
      changes.passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (input.role !== undefined || input.sectorId !== undefined) {
      const role = input.role ?? target.role;
      // Ao virar super admin, o setor some; nos outros perfis, mantém o atual se não vier um novo.
      const sectorId = input.sectorId !== undefined ? input.sectorId : role === 'SUPER_ADMIN' ? null : target.sector_id;
      const data = this.applyRoleRules(role, sectorId);
      await this.checkSectorExists(data.sectorId);
      changes.role = data.role;
      changes.sectorId = data.sectorId;
    }

    const updated = await this.users.update(id, changes);
    if (!updated) throw this.notFound();
    return toUserView(updated);
  }

  // "Apagar" um usuário = desativar (README, seção 9). Ele não consegue mais entrar.
  async deactivate(me: AuthUser, id: number): Promise<UserView> {
    return this.update(me, id, { active: false });
  }

  // Confere perfil + setor de quem está sendo criado ou alterado:
  // o super admin não tem setor; os outros perfis precisam de um (RN16).
  private applyRoleRules(role: Role, sectorId: number | null): { role: Role; sectorId: number | null } {
    if (role === 'SUPER_ADMIN') return { role, sectorId: null };
    if (sectorId === null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Escolha o setor deste usuário');
    }
    return { role, sectorId };
  }

  private async checkSectorExists(sectorId: number | null) {
    if (sectorId !== null && !(await this.sectors.findById(sectorId))) {
      throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
    }
  }

  private async checkEmailFree(email: string) {
    if (await this.users.findByEmail(email)) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Já existe um usuário com este e-mail');
    }
  }

  private notFound() {
    return new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado');
  }
}
