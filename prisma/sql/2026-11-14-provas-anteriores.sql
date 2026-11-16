-- ════════════════════════════════════════════════════════════════════════════
-- Provas anteriores oficiais (src/lib/provas/) — textos-base, tentativas
-- guardadas e os campos que a prova oficial precisa.
--
-- Idempotente (IF NOT EXISTS): rodar duas vezes não quebra nada.
-- No Supabase: SQL Editor → colar → Run. Se perguntar de RLS: "Run without RLS".
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Provas: identificador estável, tempo oficial do ano, regra da banca e fonte.
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "duracaoMin" INTEGER;
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "incluiaDiscursiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "examFormat" "ExamFormat";
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "wrongAnnulsRight" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "provas" ADD COLUMN IF NOT EXISTS "fonte" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "provas_slug_key" ON "provas"("slug");

-- 2) Textos-base ("Texto 2A1-I"), compartilhados pelos itens.
CREATE TABLE IF NOT EXISTS "prova_textos" (
  "id"       TEXT    NOT NULL,
  "provaId"  TEXT    NOT NULL,
  "codigo"   TEXT    NOT NULL,
  "titulo"   TEXT    NOT NULL,
  "conteudo" TEXT    NOT NULL,
  "ordem"    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "prova_textos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "prova_textos_provaId_codigo_key" ON "prova_textos"("provaId", "codigo");
DO $$ BEGIN
  ALTER TABLE "prova_textos" ADD CONSTRAINT "prova_textos_provaId_fkey"
    FOREIGN KEY ("provaId") REFERENCES "provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Questões: comando, texto-base, avisos de figura/fórmula e página da prova original.
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "comando" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "provaTextoId" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "temFigura" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "temFormula" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "paginaProva" INTEGER;
DO $$ BEGIN
  ALTER TABLE "questions" ADD CONSTRAINT "questions_provaTextoId_fkey"
    FOREIGN KEY ("provaTextoId") REFERENCES "prova_textos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Tentativas: cada vez que o aluno faz a prova fica guardada.
CREATE TABLE IF NOT EXISTS "prova_tentativas" (
  "id"         TEXT             NOT NULL,
  "userId"     TEXT             NOT NULL,
  "provaId"    TEXT             NOT NULL,
  "status"     TEXT             NOT NULL DEFAULT 'EM_ANDAMENTO',
  "respostas"  JSONB            NOT NULL DEFAULT '{}',
  "duracaoMin" INTEGER          NOT NULL,
  "iniciadaEm" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm"   TIMESTAMP(3)     NOT NULL,
  "entregueEm" TIMESTAMP(3),
  "acertos"    INTEGER          NOT NULL DEFAULT 0,
  "erros"      INTEGER          NOT NULL DEFAULT 0,
  "brancos"    INTEGER          NOT NULL DEFAULT 0,
  "anuladas"   INTEGER          NOT NULL DEFAULT 0,
  "pontos"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pontosMax"  INTEGER          NOT NULL DEFAULT 0,
  "porMateria" JSONB,
  "tempoMs"    INTEGER,
  CONSTRAINT "prova_tentativas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "prova_tentativas_userId_provaId_iniciadaEm_idx" ON "prova_tentativas"("userId", "provaId", "iniciadaEm");
DO $$ BEGIN
  ALTER TABLE "prova_tentativas" ADD CONSTRAINT "prova_tentativas_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "prova_tentativas" ADD CONSTRAINT "prova_tentativas_provaId_fkey"
    FOREIGN KEY ("provaId") REFERENCES "provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Registro de migrações. O pipeline de deploy (.github/workflows/promover.yml)
--    só leva para produção o código que depende deste SQL depois que a linha
--    abaixo existir — é ela que diz "o banco já está pronto".
CREATE TABLE IF NOT EXISTS "schema_migracoes" (
  "nome"       TEXT        NOT NULL,
  "aplicadaEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "schema_migracoes_pkey" PRIMARY KEY ("nome")
);
INSERT INTO "schema_migracoes" ("nome") VALUES ('2026-11-14-provas-anteriores') ON CONFLICT ("nome") DO NOTHING;

-- Conferência: deve listar as duas tabelas novas e o registro de migrações.
SELECT table_name FROM information_schema.tables WHERE table_name IN ('prova_textos', 'prova_tentativas', 'schema_migracoes');
