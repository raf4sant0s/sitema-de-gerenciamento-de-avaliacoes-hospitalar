import { describe, expect, it } from 'vitest';
import {
  answerSchema,
  commentSchema,
  questionSchema,
  responseSchema,
  roleSchema,
  scheduleSchema,
  sectorSchema,
  userSchema,
} from '../src';

const now = new Date();
const uuid = '6f1c2a3b-4d5e-4f60-8a71-b2c3d4e5f601';

describe('schemas das tabelas', () => {
  it('setor válido passa; código com tamanho diferente de 6 é recusado (RN01)', () => {
    const sector = { id: 1, name: 'Pronto Atendimento', slug: 'pronto-atendimento', code: 'PA7K2Q', active: true, created_at: now };
    expect(sectorSchema.safeParse(sector).success).toBe(true);
    expect(sectorSchema.safeParse({ ...sector, code: 'PA7' }).success).toBe(false);
  });

  it('só aceita os 3 perfis (RN16)', () => {
    expect(roleSchema.safeParse('VIEWER').success).toBe(true);
    expect(roleSchema.safeParse('GESTAO').success).toBe(false);
  });

  it('super admin não tem setor; admin de setor e visualizador precisam de setor (RN16)', () => {
    const base = { id: 1, name: 'Ana', email: 'ana@hospital.com', password_hash: 'hash', active: true, created_at: now };
    expect(userSchema.safeParse({ ...base, role: 'SUPER_ADMIN', sector_id: null }).success).toBe(true);
    expect(userSchema.safeParse({ ...base, role: 'SUPER_ADMIN', sector_id: 2 }).success).toBe(false);
    expect(userSchema.safeParse({ ...base, role: 'SECTOR_ADMIN', sector_id: 2 }).success).toBe(true);
    expect(userSchema.safeParse({ ...base, role: 'VIEWER', sector_id: null }).success).toBe(false);
  });

  it('pergunta só aceita as etapas da jornada (RN06)', () => {
    const question = { id: 1, survey_id: 1, position: 1, text: 'Como foi a recepção?', step: 'RECEPCAO', required: false, active: true };
    expect(questionSchema.safeParse(question).success).toBe(true);
    expect(questionSchema.safeParse({ ...question, step: 'FARMACIA' }).success).toBe(false);
  });

  it('carinha só vale de 1 a 5 (RN04)', () => {
    const answer = { id: 1, response_id: uuid, question_id: 1, value: 5, created_at: now };
    expect(answerSchema.safeParse(answer).success).toBe(true);
    expect(answerSchema.safeParse({ ...answer, value: 0 }).success).toBe(false);
    expect(answerSchema.safeParse({ ...answer, value: 6 }).success).toBe(false);
    expect(answerSchema.safeParse({ ...answer, value: 3.5 }).success).toBe(false);
  });

  it('resposta começa parcial, sem equipe e sem nota geral (RN09, RN14)', () => {
    const response = {
      id: uuid,
      sector_id: 1,
      survey_id: 1,
      shift_date: '2026-10-13',
      shift: 'NOITE',
      team_id: null,
      status: 'PARTIAL',
      overall_score: null,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    expect(responseSchema.safeParse(response).success).toBe(true);
    expect(responseSchema.safeParse({ ...response, status: 'DONE' }).success).toBe(false);
    expect(responseSchema.safeParse({ ...response, shift: 'MADRUGADA' }).success).toBe(false);
  });

  it('data do plantão é texto AAAA-MM-DD (RN13)', () => {
    const schedule = { id: 1, sector_id: 1, shift_date: '2026-10-13', shift: 'MANHA', team_id: 1 };
    expect(scheduleSchema.safeParse(schedule).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...schedule, shift_date: '13/10/2026' }).success).toBe(false);
  });

  it('comentário com tipo opcional e status NEW/TREATED (RN11, RN17)', () => {
    const comment = {
      id: 1,
      response_id: uuid,
      type: null,
      text: 'Fui muito bem atendida',
      status: 'NEW',
      treatment_note: null,
      treated_by: null,
      treated_at: null,
      created_at: now,
    };
    expect(commentSchema.safeParse(comment).success).toBe(true);
    expect(commentSchema.safeParse({ ...comment, type: 'ELOGIO' }).success).toBe(true);
    expect(commentSchema.safeParse({ ...comment, type: 'DENUNCIA' }).success).toBe(false);
    expect(commentSchema.safeParse({ ...comment, text: '' }).success).toBe(false);
  });
});
