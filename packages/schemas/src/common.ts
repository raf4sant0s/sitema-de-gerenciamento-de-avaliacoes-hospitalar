import { z } from 'zod';

// Peças repetidas em várias tabelas.

// Chave "serial" do banco: número inteiro positivo (1, 2, 3...)
export const idSchema = z.number().int().positive();

// Data e hora (TIMESTAMPTZ). O banco devolve como objeto Date.
export const timestampSchema = z.date();

// Data sem hora (DATE), sempre como texto "AAAA-MM-DD".
// Texto, e não Date, para o fuso horário não trocar o dia (RN13: data do plantão).
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

// RN04: toda resposta é uma carinha de 1 a 5
export const faceValueSchema = z.number().int().min(1).max(5);
