import { z } from 'zod';

// Tipos fixos do banco (README, seção 8). No SQL eles são CHECK com a lista de valores;
// aqui são z.enum com exatamente a mesma lista.

// RN16: perfis do site de gestão
export const roleSchema = z.enum(['SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER']);
export type Role = z.infer<typeof roleSchema>;

// RN06: etapas da jornada do paciente
export const journeyStepSchema = z.enum(['GERAL', 'RECEPCAO', 'TRIAGEM', 'ENFERMAGEM', 'MEDICO']);
export type JourneyStep = z.infer<typeof journeyStepSchema>;

// RN13: turnos fixos
export const shiftSchema = z.enum(['MANHA', 'TARDE', 'NOITE']);
export type Shift = z.infer<typeof shiftSchema>;

// RN09 e RN10: situação de uma resposta
export const responseStatusSchema = z.enum(['PARTIAL', 'COMPLETE', 'ABANDONED']);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;

// RN11: tipo do comentário (opcional)
export const commentTypeSchema = z.enum(['ELOGIO', 'RECLAMACAO', 'SUGESTAO']);
export type CommentType = z.infer<typeof commentTypeSchema>;

// RN17: situação do comentário
export const commentStatusSchema = z.enum(['NEW', 'TREATED']);
export type CommentStatus = z.infer<typeof commentStatusSchema>;
