-- =====================================================================
-- LIBERAR CPF — uso interno do João (conta de teste)
-- =====================================================================
-- Problema: o CPF do João ficou preso numa conta antiga e o gate de
-- "1 CPF por conta" impede usar em j.lucas.jol45@gmail.com.
--
-- O CPF é armazenado como HASH (não dá pra buscar pelo número). Então:
--   PASSO 1: liste as contas e veja quais têm CPF.
--   PASSO 2: limpe o CPF/telefone das contas que NÃO são a alvo.
--
-- Regra para os demais usuários continua: 1 CPF por conta (não mexer).
-- =====================================================================

-- ── PASSO 1 — Ver todas as contas (rode só este SELECT primeiro) ──────
SELECT
  id,
  email,
  name,
  ("cpfHash" IS NOT NULL)  AS tem_cpf,
  ("phoneHash" IS NOT NULL) AS tem_telefone,
  "createdAt"
FROM "users"
ORDER BY "createdAt";

-- ── PASSO 2 — Limpar CPF/telefone de TODAS as contas EXCETO a alvo ────
-- (Seguro agora porque ainda não há usuários reais. Libera o CPF pra você
--  cadastrar em j.lucas.jol45@gmail.com.)
-- Descomente e rode:
--
-- UPDATE "users"
-- SET "cpfHash" = NULL, "cpfEncrypted" = NULL,
--     "phoneHash" = NULL, "phoneEncrypted" = NULL
-- WHERE email <> 'j.lucas.jol45@gmail.com';

-- ── ALTERNATIVA — limpar de UMA conta específica (se preferir cirúrgico)
-- UPDATE "users"
-- SET "cpfHash" = NULL, "cpfEncrypted" = NULL,
--     "phoneHash" = NULL, "phoneEncrypted" = NULL
-- WHERE email = 'COLOQUE_O_EMAIL_DA_CONTA_ANTIGA_AQUI';
-- =====================================================================
