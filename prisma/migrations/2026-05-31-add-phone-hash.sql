-- ════════════════════════════════════════════════════════════════════════════
-- Adiciona phoneHash (único) e phoneEncrypted no User
-- Data: 2026-05-31
--
-- POR QUÊ:
-- Antes, phone era texto solto sem unique constraint. Dois aluno conseguiam
-- cadastrar com mesmo telefone (e mesmo CPF, se nunca passaram pelo
-- completar-cadastro). Agora telefone tem mesma proteção que CPF: hash único
-- pra dedup + valor criptografado em repouso.
--
-- IDEMPOTENTE. Pode rodar quantas vezes quiser.
-- ════════════════════════════════════════════════════════════════════════════

-- Adiciona colunas
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phoneHash" TEXT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phoneEncrypted" TEXT;

-- Unique constraint no hash (não no phone bruto — phone pode ter formatação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'users_phoneHash_key'
  ) THEN
    CREATE UNIQUE INDEX "users_phoneHash_key" ON "users" ("phoneHash");
  END IF;
END$$;

-- Verifica resultado
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name IN ('phoneHash','phoneEncrypted');
