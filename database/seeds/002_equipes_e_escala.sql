-- =====================================================================
-- 002_equipes_e_escala.sql  (DADOS DE EXEMPLO)
-- Três equipes por setor e a escala (RN14): qual equipe está em cada
-- setor, data de plantão e turno.
--
-- A escala cobre o mês atual inteiro e também os 30 dias anteriores,
-- porque as respostas de exemplo (arquivo 004) são dos últimos 20 dias
-- e podem cair no fim do mês passado.
-- =====================================================================

INSERT INTO teams (sector_id, name)
SELECT sectors.id, t.name
FROM sectors
CROSS JOIN (VALUES ('Equipe A'), ('Equipe B'), ('Equipe C')) AS t (name);

-- As equipes se revezam: a cada dia e a cada turno, a vez passa para a próxima equipe.
INSERT INTO schedules (sector_id, shift_date, shift, team_id)
SELECT
  sectors.id,
  days.day::date,
  shifts.shift,
  (
    SELECT teams.id
    FROM teams
    WHERE teams.sector_id = sectors.id
    ORDER BY teams.name
    OFFSET ((days.day::date - DATE '2000-01-01') + shifts.n) % 3
    LIMIT 1
  )
FROM sectors
CROSS JOIN generate_series(
  date_trunc('month', CURRENT_DATE) - INTERVAL '30 days',
  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  INTERVAL '1 day'
) AS days (day)
CROSS JOIN (VALUES (0, 'MANHA'), (1, 'TARDE'), (2, 'NOITE')) AS shifts (n, shift);
