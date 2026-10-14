-- =====================================================================
-- 002_equipes_ativas.sql
-- Equipes passam a poder ser desativadas, em vez de apagadas (tarefa B14).
--
-- Decisão da dupla: uma equipe que já está na escala ou em respostas não é
-- apagada; ela é desativada, some das opções da escala e o histórico continua.
--
-- Rodar com: npm run db:migrate (na raiz do projeto). O banco é o mesmo para
-- as duas: avise a colega antes de rodar.
-- =====================================================================

ALTER TABLE teams
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
