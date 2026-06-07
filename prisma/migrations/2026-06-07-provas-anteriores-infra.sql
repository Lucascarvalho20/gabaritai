-- ════════════════════════════════════════════════════════════════════════════
-- INFRA — PROVAS ANTERIORES (simulador)
-- Data: 2026-06-07
--
-- Adiciona campos faltantes em `provas` + cria tabela `prova_attempts`
-- (histórico de tentativas do aluno fazendo a prova).
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Adicionar colunas faltantes em provas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'numeroQuestoes') THEN
    ALTER TABLE "provas" ADD COLUMN "numeroQuestoes" int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'tempoLimiteMinutos') THEN
    ALTER TABLE "provas" ADD COLUMN "tempoLimiteMinutos" int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'gabaritoOficialPublicadoEm') THEN
    ALTER TABLE "provas" ADD COLUMN "gabaritoOficialPublicadoEm" timestamp;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'observacoes') THEN
    ALTER TABLE "provas" ADD COLUMN "observacoes" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'extracaoStatus') THEN
    ALTER TABLE "provas" ADD COLUMN "extracaoStatus" text DEFAULT 'PENDENTE';
    -- Valores: PENDENTE | PROCESSANDO | EXTRAIDO | ERRO | REVISADO
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'updatedAt') THEN
    ALTER TABLE "provas" ADD COLUMN "updatedAt" timestamp DEFAULT NOW();
  END IF;
END $$;

-- 2. Tabela prova_attempts (tentativas do aluno)
CREATE TABLE IF NOT EXISTS "prova_attempts" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "provaId" text NOT NULL,
  "startedAt" timestamp NOT NULL DEFAULT NOW(),
  "finishedAt" timestamp,
  "durationSec" int,
  "respostas" jsonb NOT NULL DEFAULT '{}',
  -- formato: { "questaoId": "A" | "B" | "C" | "D" | "E" | null }
  "totalQuestoes" int,
  "totalCorretas" int,
  "totalErradas" int,
  "totalAnuladas" int,
  "totalEmBranco" int,
  "notaBruta" decimal(5,2), -- % acerto sem anuladas
  "notaComAnuladas" decimal(5,2), -- % acerto considerando anuladas como ponto
  "completed" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),

  CONSTRAINT "prova_attempts_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "prova_attempts_prova_fk" FOREIGN KEY ("provaId") REFERENCES "provas"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "prova_attempts_user_idx" ON "prova_attempts"("userId");
CREATE INDEX IF NOT EXISTS "prova_attempts_prova_idx" ON "prova_attempts"("provaId");
CREATE INDEX IF NOT EXISTS "prova_attempts_user_prova_idx" ON "prova_attempts"("userId", "provaId");
CREATE INDEX IF NOT EXISTS "prova_attempts_finished_idx" ON "prova_attempts"("finishedAt") WHERE "completed" = true;

DO $$
DECLARE v_provas int;
DECLARE v_attempts int;
BEGIN
  SELECT COUNT(*) INTO v_provas FROM "provas";
  SELECT COUNT(*) INTO v_attempts FROM "prova_attempts";
  RAISE NOTICE 'Infra provas OK — provas: % | tentativas: %', v_provas, v_attempts;
END $$;
