-- =====================================================================
-- 001_setores_e_pesquisas.sql  (DADOS DE EXEMPLO)
-- Setores, uma pesquisa ativa por setor e as perguntas de cada uma.
--
-- Rodar com: npm run db:seed (na raiz do projeto). Os arquivos de seeds
-- rodam juntos, em ordem, numa transação só. Por isso não há BEGIN/COMMIT.
-- =====================================================================

-- RN01: cada setor tem um link (slug): /avaliacao/<slug>.
INSERT INTO sectors (name, slug) VALUES
  ('Pronto Atendimento', 'pronto-atendimento'),
  ('Internação',         'internacao'),
  ('Raio-X',             'raio-x'),
  ('Ambulatório',        'ambulatorio');

-- RN02: uma pesquisa ativa por setor.
INSERT INTO surveys (sector_id, title)
SELECT id, 'Pesquisa de satisfação · ' || name
FROM sectors;

-- RN05: uma única pergunta obrigatória (a avaliação geral), sempre na última posição.
-- RN06: cada setor só tem as etapas da jornada que fazem sentido para ele.
INSERT INTO questions (survey_id, position, text, step, required)
SELECT surveys.id, q.position, q.text, q.step, q.required
FROM (VALUES
  ('pronto-atendimento', 1, 'Como foi o atendimento na recepção?',                         'RECEPCAO',   FALSE),
  ('pronto-atendimento', 2, 'Como foi a triagem?',                                         'TRIAGEM',    FALSE),
  ('pronto-atendimento', 3, 'Como foi o atendimento da enfermagem?',                       'ENFERMAGEM', FALSE),
  ('pronto-atendimento', 4, 'Como foi o atendimento do médico?',                           'MEDICO',     FALSE),
  ('pronto-atendimento', 5, 'No geral, como você avalia o atendimento do hospital hoje?', 'GERAL',      TRUE),

  ('internacao',         1, 'Como foi o atendimento na recepção?',                         'RECEPCAO',   FALSE),
  ('internacao',         2, 'Como foi o atendimento da enfermagem?',                       'ENFERMAGEM', FALSE),
  ('internacao',         3, 'Como foi o atendimento do médico?',                           'MEDICO',     FALSE),
  ('internacao',         4, 'No geral, como você avalia o atendimento do hospital hoje?', 'GERAL',      TRUE),

  ('raio-x',             1, 'Como foi o atendimento na recepção?',                         'RECEPCAO',   FALSE),
  ('raio-x',             2, 'No geral, como você avalia o atendimento do hospital hoje?', 'GERAL',      TRUE),

  ('ambulatorio',        1, 'Como foi o atendimento na recepção?',                         'RECEPCAO',   FALSE),
  ('ambulatorio',        2, 'Como foi o atendimento da enfermagem?',                       'ENFERMAGEM', FALSE),
  ('ambulatorio',        3, 'Como foi o atendimento do médico?',                           'MEDICO',     FALSE),
  ('ambulatorio',        4, 'No geral, como você avalia o atendimento do hospital hoje?', 'GERAL',      TRUE)
) AS q (slug, position, text, step, required)
JOIN sectors ON sectors.slug = q.slug
JOIN surveys ON surveys.sector_id = sectors.id AND surveys.active;
