-- ============================================================================
-- Conta única de acesso total + remoção das contas de teste
--
-- Rodar no SQL Editor do Supabase ("Run without RLS").
-- Rode PASSO A PASSO e confira o resultado de cada SELECT antes de seguir.
-- ============================================================================

-- ─── PASSO 1 — Ver o que existe hoje (só leitura, rode primeiro) ────────────
SELECT id, email, name, role, plan, "hasFullAccess", active, "createdAt"
FROM users
ORDER BY "createdAt";


-- ─── PASSO 2 — Identificar as contas de teste ───────────────────────────────
-- Confira a lista antes de apagar. Se alguma conta REAL aparecer aqui, pare.
SELECT id, email, role, plan
FROM users
WHERE email IN (
  'beta@gabaritai.com.br',
  'bb@gabaritai.com.br',
  'bombeiro@gabaritai.com.br',
  'cef@gabaritai.com.br',
  'cnu@gabaritai.com.br',
  'pf@gabaritai.com.br',
  'pmdf@gabaritai.com.br',
  'tjdft@gabaritai.com.br',
  'teste-full@gabaritai.com.br',
  'teste-pmdf@gabaritai.com.br'
);


-- ─── PASSO 3 — Apagar as contas de teste ────────────────────────────────────
-- As tabelas filhas (progresso, flashcards, matrículas) têm ON DELETE CASCADE
-- no schema, então somem junto. É por isso que não é preciso limpar na mão.
--
-- Note que 'admin@gabaritai.com.br' NÃO está na lista: é a conta que fica.
DELETE FROM users
WHERE email IN (
  'beta@gabaritai.com.br',
  'bb@gabaritai.com.br',
  'bombeiro@gabaritai.com.br',
  'cef@gabaritai.com.br',
  'cnu@gabaritai.com.br',
  'pf@gabaritai.com.br',
  'pmdf@gabaritai.com.br',
  'tjdft@gabaritai.com.br',
  'teste-full@gabaritai.com.br',
  'teste-pmdf@gabaritai.com.br'
);


-- ─── PASSO 4 — Deixar a conta principal com acesso a tudo ───────────────────
-- role = ADMIN        → painel administrativo
-- hasFullAccess       → bypassa plano e matrícula; vê tudo como aluno também
-- plan = LIFETIME     → nenhum bloqueio de plano
-- active, emailVerified, lockedUntil → garante que entra sem travar
--
-- Troque o e-mail abaixo se o seu for outro.
UPDATE users
SET role            = 'ADMIN',
    plan            = 'LIFETIME',
    "hasFullAccess" = true,
    active          = true,
    "emailVerified" = true,
    "lockedUntil"   = NULL,
    "failedLoginCount"    = 0
WHERE email = 'admin@gabaritai.com.br';


-- ─── PASSO 5 — Matricular a conta em todos os cursos ────────────────────────
-- hasFullAccess já libera o conteúdo, mas a matrícula explícita faz os cursos
-- aparecerem em "Meus cursos". ON CONFLICT evita duplicar se já existir.
INSERT INTO "user_course_enrollments" ("id", "userId", "courseId", "enrolledAt", "isActive")
SELECT gen_random_uuid()::text, u.id, c.id, NOW(), true
FROM users u
CROSS JOIN courses c
WHERE u.email = 'admin@gabaritai.com.br'
  AND c.active = true
ON CONFLICT ("userId", "courseId") DO NOTHING;


-- ─── PASSO 6 — Conferir o resultado ─────────────────────────────────────────
SELECT u.email, u.role, u.plan, u."hasFullAccess", u.active,
       COUNT(e.id) AS cursos_matriculados
FROM users u
LEFT JOIN "user_course_enrollments" e ON e."userId" = u.id
GROUP BY u.id, u.email, u.role, u.plan, u."hasFullAccess", u.active
ORDER BY u."createdAt";


-- ============================================================================
-- IMPORTANTE — a senha NÃO é trocada aqui.
--
-- Senha fica em bcrypt no banco; SQL não gera hash bcrypt. Para definir a nova
-- senha, use o endpoint (depois de configurar SETUP_SECRET na Vercel):
--
--   curl -X POST https://gabaritai-red.vercel.app/api/setup/ensure-admin \
--     -H "Authorization: Bearer SEU_SETUP_SECRET" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"admin@gabaritai.com.br","password":"SUA_NOVA_SENHA"}'
-- ============================================================================
