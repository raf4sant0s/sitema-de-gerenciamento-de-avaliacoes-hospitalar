import bcrypt from 'bcryptjs';
import type { User } from '@avaliacoes/schemas';
import type { UsersRepository } from '../../database/repositories/users.repository';
import { type AuthUser, signToken } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// Regras do login. Usa só a interface UsersRepository (não sabe qual é o banco).

// O que a API devolve sobre o usuário: nunca a senha (nem embaralhada).
export function toAuthUser(user: User): AuthUser {
  return { id: user.id, name: user.name, role: user.role, sectorId: user.sector_id };
}

export async function login(users: UsersRepository, email: string, password: string) {
  const user = await users.findByEmail(email);

  // A senha guardada está embaralhada com bcrypt; compare() embaralha a digitada e compara.
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

  // E-mail que não existe, senha errada e usuário desativado recebem a MESMA mensagem,
  // para ninguém descobrir quais e-mails estão cadastrados.
  if (!user || !passwordOk || !user.active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos');
  }

  const authUser = toAuthUser(user);
  return { token: signToken(authUser), user: authUser };
}

export async function getCurrentUser(users: UsersRepository, id: number): Promise<AuthUser> {
  const user = await users.findById(id);

  // Usuário apagado ou desativado depois do login perde o acesso aqui.
  if (!user || !user.active) {
    throw new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar');
  }

  return toAuthUser(user);
}

// "Minha senha": a própria pessoa troca a senha, confirmando a atual (decisão da dupla, tarefa B12).
export async function changePassword(users: UsersRepository, id: number, currentPassword: string, newPassword: string) {
  const user = await users.findById(id);
  if (!user || !user.active) {
    throw new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar');
  }

  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new AppError(400, 'WRONG_PASSWORD', 'A senha atual está incorreta');
  }

  await users.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
}
