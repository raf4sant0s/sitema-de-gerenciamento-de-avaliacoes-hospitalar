-- =====================================================================
-- 003_indice_respostas_plantao.sql
-- Índice das respostas por setor + data do plantão + turno.
--
-- Por quê (relatório do banco, docs/banco-de-dados.md, seção 7):
-- o dashboard e a escala procuram as respostas por setor, data do plantão
-- (shift_date) e turno (shift), e não pela data em que a resposta chegou
-- (created_at). O índice responses_sector_created_at, da migration 001,
-- ajuda pouco nessas buscas. Este índice segue a ordem em que elas filtram.
--
-- Só acrescenta o índice: nenhum dado é criado, mudado ou apagado.
--
-- Rodar com: npm run db:migrate (na raiz do projeto). O banco é o mesmo para
-- as duas: avise a colega antes de rodar.
-- =====================================================================

CREATE INDEX responses_sector_shift
  ON responses (sector_id, shift_date, shift);
