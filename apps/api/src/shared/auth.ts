import type { Role } from '@avaliacoes/schemas';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errors';

// Login e perfis (RN16).
// Quem entra recebe um "crachá" (token JWT) assinado pela API, válido por 8 horas.
// A cada pedido, o site manda o crachá no cabeçalho: Authorization: Bearer <token>.

// Dados do usuário logado que vão dentro do crachá. Nunca vai a senha.
export interface AuthUser {
  id: number;
  name: string;
  role: Role;
  sectorId: number | null;
}

// Faz o TypeScript saber que, depois do requireAuth, req.user existe.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Decisão da dupla: a pessoa fica logada por 8 horas (mais ou menos um turno).
export const TOKEN_DURATION = '8h';

export function signToken(user: AuthUser): string {
  return jwt.sign({ name: user.name, role: user.role, sectorId: user.sectorId }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: TOKEN_DURATION,
  });
}

// Confere o crachá. Devolve o usuário de dentro dele, ou null se for falso, alterado ou vencido.
export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return {
      id: Number(payload.sub),
      name: payload.name,
      role: payload.role,
      sectorId: payload.sectorId ?? null,
    };
  } catch {
    return null;
  }
}

// Middleware: só deixa passar quem mandou um crachá válido. Coloca o usuário em req.user.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');

  const user = type === 'Bearer' && token ? verifyToken(token) : null;
  if (!user) {
    next(new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar'));
    return;
  }

  req.user = user;
  next();
};

// Middleware: só deixa passar os perfis da lista. Usar sempre depois do requireAuth.
// Exemplo: router.post('/sectors', requireAuth, requireRole('SUPER_ADMIN'), ...)
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Seu perfil não tem permissão para isso'));
      return;
    }
    next();
  };
}

// RN16: o super admin acessa todos os setores; admin de setor e visualizador, só o próprio.
export function canAccessSector(user: AuthUser, sectorId: number): boolean {
  return user.role === 'SUPER_ADMIN' || user.sectorId === sectorId;
}

// Mesma regra, mas já recusando o pedido. Usar dentro dos services dos módulos.
export function assertSectorAccess(user: AuthUser, sectorId: number): void {
  if (!canAccessSector(user, sectorId)) {
    throw new AppError(403, 'FORBIDDEN', 'Você só tem acesso aos dados do seu setor');
  }
}
