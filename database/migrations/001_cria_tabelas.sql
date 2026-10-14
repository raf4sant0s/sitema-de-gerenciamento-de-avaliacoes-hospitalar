-- =====================================================================
-- 001_cria_tabelas.sql
-- Cria todas as tabelas do sistema (contrato: README, seção 8).
--
-- SQL padrão do PostgreSQL, sem recursos exclusivos do Supabase,
-- para o banco poder ser trocado no futuro (RNF01).
--
-- Rodar com: npm run db:migrate (na raiz do projeto).
-- O comando já roda o arquivo inteiro numa transação: ou tudo dá certo,
-- ou nada muda no banco. Por isso este arquivo não tem BEGIN/COMMIT.
--
-- Regra: uma migration que já rodou nunca é editada.
-- Para mudar algo, crie uma nova (002_..., 003_...).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Setores do hospital (RN01): cada um tem um link próprio (slug)
-- e um código curto de 6 caracteres. Os dois viram QR Code.
-- ---------------------------------------------------------------------
CREATE TABLE sectors (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  code        CHAR(6)     NOT NULL UNIQUE,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Usuários do site de gestão (RN16).
-- O super admin não pertence a um setor; os outros perfis sim.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             SERIAL      PRIMARY KEY,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  role           TEXT        NOT NULL
                 CHECK (role IN ('SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER')),
  sector_id      INTEGER     REFERENCES sectors (id),
  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- sector_id é nulo só para SUPER_ADMIN e obrigatório para os outros perfis
  CONSTRAINT users_sector_by_role CHECK (
    (role = 'SUPER_ADMIN' AND sector_id IS NULL)
    OR (role <> 'SUPER_ADMIN' AND sector_id IS NOT NULL)
  )
);

-- ---------------------------------------------------------------------
-- Pesquisas (RN02): só uma ativa por setor.
-- ---------------------------------------------------------------------
CREATE TABLE surveys (
  id          SERIAL      PRIMARY KEY,
  sector_id   INTEGER     NOT NULL REFERENCES sectors (id),
  title       TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RN02: no máximo uma pesquisa ativa por setor
CREATE UNIQUE INDEX surveys_one_active_per_sector
  ON surveys (sector_id)
  WHERE active;

-- ---------------------------------------------------------------------
-- Perguntas (RN04, RN05, RN06): todas com carinhas de 1 a 5,
-- organizadas por etapa da jornada, e só uma obrigatória por pesquisa.
-- ---------------------------------------------------------------------
CREATE TABLE questions (
  id         SERIAL   PRIMARY KEY,
  survey_id  INTEGER  NOT NULL REFERENCES surveys (id),
  position   INTEGER  NOT NULL,
  text       TEXT     NOT NULL,
  step       TEXT     NOT NULL DEFAULT 'GERAL'
             CHECK (step IN ('GERAL', 'RECEPCAO', 'TRIAGEM', 'ENFERMAGEM', 'MEDICO')),
  required   BOOLEAN  NOT NULL DEFAULT FALSE,
  active     BOOLEAN  NOT NULL DEFAULT TRUE
);

-- RN05: no máximo uma pergunta obrigatória por pesquisa
CREATE UNIQUE INDEX questions_one_required_per_survey
  ON questions (survey_id)
  WHERE required;

-- ---------------------------------------------------------------------
-- Equipes de cada setor (RN14, RN15).
-- ---------------------------------------------------------------------
CREATE TABLE teams (
  id         SERIAL   PRIMARY KEY,
  sector_id  INTEGER  NOT NULL REFERENCES sectors (id),
  name       TEXT     NOT NULL
);

-- ---------------------------------------------------------------------
-- Escala mensal (RN13, RN14): qual equipe estava em cada setor,
-- em cada data de plantão e turno. Só uma equipe por combinação.
-- ---------------------------------------------------------------------
CREATE TABLE schedules (
  id          SERIAL   PRIMARY KEY,
  sector_id   INTEGER  NOT NULL REFERENCES sectors (id),
  shift_date  DATE     NOT NULL,
  shift       TEXT     NOT NULL
              CHECK (shift IN ('MANHA', 'TARDE', 'NOITE')),
  team_id     INTEGER  NOT NULL REFERENCES teams (id),
  CONSTRAINT schedules_one_team_per_shift UNIQUE (sector_id, shift_date, shift)
);

-- ---------------------------------------------------------------------
-- Respostas da pesquisa (RN08, RN09, RN10, RN12).
-- 100% anônimas: nenhuma coluna guarda dado pessoal do paciente.
-- updated_at é atualizado pela API a cada toque (sem gatilhos no banco,
-- para manter o SQL simples e fácil de levar para outro banco).
-- ---------------------------------------------------------------------
CREATE TABLE responses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id      INTEGER     NOT NULL REFERENCES sectors (id),
  survey_id      INTEGER     NOT NULL REFERENCES surveys (id),
  shift_date     DATE        NOT NULL,
  shift          TEXT        NOT NULL
                 CHECK (shift IN ('MANHA', 'TARDE', 'NOITE')),
  team_id        INTEGER     REFERENCES teams (id),
  status         TEXT        NOT NULL DEFAULT 'PARTIAL'
                 CHECK (status IN ('PARTIAL', 'COMPLETE', 'ABANDONED')),
  overall_score  INTEGER     CHECK (overall_score BETWEEN 1 AND 5),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX responses_sector_created_at
  ON responses (sector_id, created_at);

-- ---------------------------------------------------------------------
-- Cada toque numa carinha (RN04, RN09). Uma linha por pergunta
-- respondida; responder de novo a mesma pergunta atualiza a linha.
-- ---------------------------------------------------------------------
CREATE TABLE answers (
  id           SERIAL      PRIMARY KEY,
  response_id  UUID        NOT NULL REFERENCES responses (id),
  question_id  INTEGER     NOT NULL REFERENCES questions (id),
  value        INTEGER     NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT answers_one_per_question UNIQUE (response_id, question_id)
);

-- ---------------------------------------------------------------------
-- Comentários anônimos (RN11, RN17, RN18).
-- O tipo é opcional; o tratamento é feito pelos admins.
-- ---------------------------------------------------------------------
CREATE TABLE comments (
  id              SERIAL      PRIMARY KEY,
  response_id     UUID        NOT NULL REFERENCES responses (id),
  type            TEXT        CHECK (type IN ('ELOGIO', 'RECLAMACAO', 'SUGESTAO')),
  text            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'NEW'
                  CHECK (status IN ('NEW', 'TREATED')),
  treatment_note  TEXT,
  treated_by      INTEGER     REFERENCES users (id),
  treated_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_status
  ON comments (status);
