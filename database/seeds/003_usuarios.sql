-- =====================================================================
-- 003_usuarios.sql  (DADOS DE EXEMPLO)
-- Um usuário de cada perfil (RN16), para testar o login e as permissões.
--
-- A senha NUNCA fica escrita aqui. {{SEED_PASSWORD_HASH}} é trocado pelo
-- comando npm run db:seed pelo hash (bcrypt) da senha SEED_PASSWORD,
-- que fica só no arquivo apps/api/.env.
-- Os e-mails usam o domínio example.com, reservado para exemplos.
-- =====================================================================

INSERT INTO users (name, email, password_hash, role, sector_id)
SELECT u.name, u.email, '{{SEED_PASSWORD_HASH}}', u.role, sectors.id
FROM (VALUES
  ('Super admin (exemplo)',                       'superadmin@example.com',        'SUPER_ADMIN',  NULL),
  ('Admin do Pronto Atendimento (exemplo)',       'admin.pa@example.com',          'SECTOR_ADMIN', 'pronto-atendimento'),
  ('Visualizador do Pronto Atendimento (exemplo)', 'visualizador.pa@example.com',  'VIEWER',       'pronto-atendimento')
) AS u (name, email, role, sector_slug)
LEFT JOIN sectors ON sectors.slug = u.sector_slug;
