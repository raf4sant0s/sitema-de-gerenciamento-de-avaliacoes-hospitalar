-- =====================================================================
-- 004_remove_codigo_setor.sql
-- Apaga o código curto dos setores (coluna sectors.code).
--
-- Por quê (decisão da dupla em 27/10/2026, a pedido do professor):
-- cada setor passou a ter um link só, /avaliacao/<slug>, e um QR Code só
-- (RN01). O link pelo código curto (/c/<CODIGO>) deixou de existir, e
-- nada mais no sistema usa o código.
--
-- O índice único da coluna (UNIQUE) é apagado junto com ela.
-- Nenhum outro dado muda.
--
-- Rodar com: npm run db:migrate (na raiz do projeto). O banco é o mesmo para
-- as duas: avise a colega antes de rodar.
-- =====================================================================

ALTER TABLE sectors DROP COLUMN code;
