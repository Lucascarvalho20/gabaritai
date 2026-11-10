-- ════════════════════════════════════════════════════════════════════════════
-- Vigia dos crons (src/lib/vigia.ts) — histórico de execuções e travas de aviso.
--
-- Substitui o Healthchecks.io: o próprio banco guarda cada rodada das tarefas
-- agendadas, e o site descobre sozinho qual tarefa sumiu.
--
-- Idempotente (IF NOT EXISTS): rodar duas vezes não quebra nada.
-- No Supabase: SQL Editor → colar → Run. Se perguntar de RLS: "Run without RLS"
-- (o projeto acessa o banco só pelo servidor, com Prisma).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "cron_execucoes" (
  "id"        TEXT         NOT NULL,
  "tarefa"    TEXT         NOT NULL,
  "ok"        BOOLEAN      NOT NULL,
  "status"    INTEGER,
  "detalhe"   TEXT,
  "duracaoMs" INTEGER      NOT NULL,
  "criadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cron_execucoes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cron_execucoes_tarefa_criadoEm_idx" ON "cron_execucoes" ("tarefa", "criadoEm");

CREATE TABLE IF NOT EXISTS "cron_alertas" (
  "id"         TEXT         NOT NULL,
  "tarefa"     TEXT         NOT NULL,
  "referencia" TEXT         NOT NULL,
  "criadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cron_alertas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cron_alertas_tarefa_referencia_key" ON "cron_alertas" ("tarefa", "referencia");

-- Conferência: deve listar as duas tabelas.
SELECT table_name FROM information_schema.tables WHERE table_name IN ('cron_execucoes', 'cron_alertas');
