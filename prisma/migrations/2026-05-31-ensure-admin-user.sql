-- ════════════════════════════════════════════════════════════════════════════
-- Garante que o usuário admin existe com senha correta
-- Data: 2026-05-31
--
-- Email: admin@gabaritai.com.br
-- Senha: Admin@2024!
-- (hash bcrypt rounds=12 já calculado abaixo)
--
-- IDEMPOTENTE: pode rodar quantas vezes quiser.
-- Se admin não existe → cria.
-- Se existe → atualiza senha + role + active + desbloqueia + reseta failedLogin.
--
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → cola tudo → Run.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO "users" (
  id, name, email, password, role, plan, active,
  "emailVerified", "failedLoginCount", "tutorialCompleted",
  "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'Admin Gabaritai',
  'admin@gabaritai.com.br',
  '$2a$12$8oe8ZiAOUHA3pzX4R11H8uPyXo/wgpe7d2TMHE/PutnqvYB96Fad6',
  'ADMIN',
  'LIFETIME',
  true,
  true,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,        -- reseta senha
  role = 'ADMIN',                       -- garante role admin
  active = true,                        -- desativa archive
  "failedLoginCount" = 0,               -- reseta contador de tentativas
  "lockedUntil" = NULL,                 -- desbloqueia se travado
  "emailVerified" = true,               -- garante email verificado
  "updatedAt" = NOW();

-- Verifica resultado:
-- SELECT email, role, active, "failedLoginCount", "lockedUntil"
-- FROM "users" WHERE email = 'admin@gabaritai.com.br';
--
-- Depois disso, login: admin@gabaritai.com.br / Admin@2024!
