-- =====================================================================
-- 004_respostas_e_comentarios.sql  (DADOS DE EXEMPLO)
-- 160 respostas dos últimos 20 dias, com as carinhas (answers) e
-- comentários variados, para o dashboard e o TV Wall terem o que mostrar.
--
-- Mistura de propósito:
--   - setores com muitas e poucas respostas (o Ambulatório tem poucas,
--     para aparecer "dados insuficientes" por equipe, RN15);
--   - respostas COMPLETE, ABANDONED e algumas PARTIAL recentes (RN10);
--   - perguntas opcionais puladas (RN07);
--   - comentários dos três tipos e sem tipo, alguns já tratados (RN11, RN17).
-- Nenhum dado pessoal do paciente (RN08).
-- =====================================================================

-- Fixa o sorteio: rodar de novo num banco vazio gera os mesmos dados.
SELECT setseed(0.42);

-- Tabela temporária com o "sorteio" de cada resposta. Some sozinha no fim da transação.
CREATE TEMP TABLE seed_responses ON COMMIT DROP AS
WITH draw AS (
  SELECT
    n,
    random() AS r_sector,
    random() AS r_time,
    random() AS r_status,
    random() AS r_mood,
    random() AS r_progress,
    random() AS r_comment
  FROM generate_series(1, 160) AS n
)
SELECT
  n,
  gen_random_uuid() AS id,
  (
    SELECT id FROM sectors WHERE slug = CASE
      WHEN r_sector < 0.45 THEN 'pronto-atendimento'
      WHEN r_sector < 0.72 THEN 'internacao'
      WHEN r_sector < 0.94 THEN 'raio-x'
      ELSE 'ambulatorio'
    END
  ) AS sector_id,
  -- As 4 primeiras são de agora há pouco e ainda estão PARTIAL (paciente respondendo).
  CASE
    WHEN n <= 4 THEN NOW() - n * INTERVAL '5 minutes'
    ELSE NOW() - INTERVAL '1 hour' - r_time * INTERVAL '20 days'
  END AS created_at,
  CASE
    WHEN n <= 4 THEN 'PARTIAL'
    WHEN r_status < 0.82 THEN 'COMPLETE'
    ELSE 'ABANDONED'
  END AS status,
  (r_mood - 0.5) * 3 AS mood, -- humor do paciente: puxa todas as notas dele para cima ou para baixo
  r_progress AS progress,     -- até onde foi quem não terminou
  r_comment AS comment_draw
FROM draw;

-- Respostas. Turno e data do plantão seguem a RN13 (horário de Brasília;
-- madrugada é o plantão da noite anterior). A equipe vem da escala (RN14).
INSERT INTO responses (id, sector_id, survey_id, shift_date, shift, team_id, status, created_at, updated_at, completed_at)
SELECT
  r.id,
  r.sector_id,
  surveys.id,
  t.shift_date,
  t.shift,
  schedules.team_id,
  r.status,
  r.created_at,
  r.created_at + INTERVAL '2 minutes',
  CASE WHEN r.status = 'COMPLETE' THEN r.created_at + INTERVAL '2 minutes' END
FROM seed_responses AS r
JOIN surveys ON surveys.sector_id = r.sector_id AND surveys.active
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN l.hour < 7 THEN 'NOITE'
      WHEN l.hour < 13 THEN 'MANHA'
      WHEN l.hour < 19 THEN 'TARDE'
      ELSE 'NOITE'
    END AS shift,
    CASE WHEN l.hour < 7 THEN l.day - 1 ELSE l.day END AS shift_date
  FROM (
    SELECT
      EXTRACT(HOUR FROM r.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
      (r.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day
  ) AS l
) AS t
LEFT JOIN schedules
  ON schedules.sector_id = r.sector_id
 AND schedules.shift_date = t.shift_date
 AND schedules.shift = t.shift;

-- Carinhas (1 a 5). Cada etapa tem uma nota média diferente, para o dashboard
-- mostrar diferenças (a recepção é a pior, o médico a melhor).
--   COMPLETE: a obrigatória sempre respondida; cada opcional tem 20% de chance de ser pulada.
--   PARTIAL/ABANDONED: respondeu só as primeiras perguntas e parou antes da obrigatória.
INSERT INTO answers (response_id, question_id, value, created_at)
SELECT
  r.id,
  questions.id,
  GREATEST(1, LEAST(5, ROUND(
    CASE questions.step
      WHEN 'RECEPCAO' THEN 3.2
      WHEN 'TRIAGEM' THEN 3.7
      WHEN 'ENFERMAGEM' THEN 4.0
      WHEN 'MEDICO' THEN 4.2
      ELSE 3.8
    END
    + CASE sectors.slug WHEN 'pronto-atendimento' THEN -0.3 WHEN 'raio-x' THEN 0.4 ELSE 0 END
    + r.mood
    + (random() - 0.5) * 1.5
  )))::int,
  r.created_at + questions.position * INTERVAL '15 seconds'
FROM seed_responses AS r
JOIN sectors ON sectors.id = r.sector_id
JOIN surveys ON surveys.sector_id = r.sector_id AND surveys.active
JOIN questions ON questions.survey_id = surveys.id AND questions.active
CROSS JOIN LATERAL (
  SELECT MAX(position) AS last_position FROM questions AS q WHERE q.survey_id = surveys.id
) AS lp
WHERE CASE
  WHEN r.status = 'COMPLETE' THEN questions.required OR random() < 0.8
  ELSE NOT questions.required
   AND questions.position <= 1 + FLOOR(r.progress * (lp.last_position - 1))
END;

-- RN20: overall_score é a cópia da nota da pergunta obrigatória.
UPDATE responses
SET overall_score = answers.value
FROM answers
JOIN questions ON questions.id = answers.question_id AND questions.required
WHERE answers.response_id = responses.id
  AND responses.id IN (SELECT id FROM seed_responses);

-- Comentários em parte das respostas completas, mais nas de nota baixa (RN11).
-- O tipo combina com a nota geral; 1 em cada 8 fica sem tipo (o tipo é opcional).
-- Comentários com mais de 5 dias: metade já foi tratada pelo super admin (RN17).
WITH chosen AS (
  SELECT
    r.id,
    r.n,
    r.created_at,
    CASE
      WHEN r.n % 8 = 0 THEN NULL
      WHEN responses.overall_score <= 2 THEN 'RECLAMACAO'
      WHEN responses.overall_score >= 4 THEN 'ELOGIO'
      WHEN r.n % 2 = 0 THEN 'RECLAMACAO'
      ELSE 'SUGESTAO'
    END AS type,
    (r.created_at < NOW() - INTERVAL '5 days' AND r.n % 2 = 0) AS treated
  FROM seed_responses AS r
  JOIN responses ON responses.id = r.id
  WHERE responses.status = 'COMPLETE'
    -- quem deu nota baixa quase sempre escreve alguma coisa
    AND (r.comment_draw < 0.4 OR (responses.overall_score <= 3 AND r.comment_draw < 0.8))
)
INSERT INTO comments (response_id, type, text, status, treatment_note, treated_by, treated_at, created_at)
SELECT
  c.id,
  c.type,
  CASE c.type
    WHEN 'RECLAMACAO' THEN (ARRAY[
      'Esperei mais de duas horas na recepção e ninguém explicou quanto ia demorar.',
      'O banheiro da recepção estava sem papel e sem sabonete.',
      'Fui mal atendido no balcão, a atendente estava sem paciência.',
      'Demoraram muito para chamar, e a senha no painel não funcionava.',
      'Não tinha cadeira para todo mundo na sala de espera.',
      'Ninguém soube me dizer onde pegar o resultado do exame.'
    ])[1 + c.n % 6]
    WHEN 'ELOGIO' THEN (ARRAY[
      'A enfermeira foi muito atenciosa e explicou tudo com calma.',
      'O médico me ouviu com paciência. Obrigado!',
      'Atendimento rápido, fui embora em menos de uma hora.',
      'A equipe da noite foi muito educada com a minha mãe.',
      'O técnico do exame foi muito gentil.',
      'Tudo muito limpo e organizado. Parabéns!'
    ])[1 + c.n % 6]
    WHEN 'SUGESTAO' THEN (ARRAY[
      'Poderia ter um bebedouro na sala de espera.',
      'Seria bom avisar o tempo de espera numa TV.',
      'Coloquem mais cadeiras perto da recepção.',
      'Poderiam ter uma placa indicando onde fica cada setor.',
      'Uma tomada para carregar o celular ajudaria quem espera muito.'
    ])[1 + c.n % 5]
    ELSE (ARRAY[
      'Foi tudo normal.',
      'Atendimento ok, mas a espera foi longa.',
      'Gostei do médico, mas a recepção precisa melhorar.'
    ])[1 + c.n % 3]
  END,
  CASE WHEN c.treated THEN 'TREATED' ELSE 'NEW' END,
  CASE WHEN c.treated THEN 'Comentário repassado à equipe do setor na reunião semanal.' END,
  CASE WHEN c.treated THEN (SELECT id FROM users WHERE email = 'superadmin@example.com') END,
  CASE WHEN c.treated THEN c.created_at + INTERVAL '1 day' END,
  c.created_at + INTERVAL '2 minutes'
FROM chosen AS c;
