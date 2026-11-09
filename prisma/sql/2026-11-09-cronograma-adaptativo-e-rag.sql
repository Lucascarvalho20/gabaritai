-- ============================================================================
-- Cronograma adaptativo + busca semântica (RAG) do mentor
--
-- Rodar UMA vez no SQL Editor do Supabase, ANTES do deploy que usa estas
-- colunas. Idempotente: rodar de novo não quebra nada.
-- (O Supabase vai perguntar sobre RLS — este projeto não usa: "Run without RLS".)
--
-- Por que a ordem importa: o código novo lê `study_plans.turbo`. Se ele subir
-- antes da coluna existir, toda tela de cronograma quebra. Coluna nova com
-- valor padrão é invisível para o código antigo — então banco primeiro,
-- código depois, sempre.
-- ============================================================================

-- 1) Modos do cronograma gravados no plano.
--    Antes o turbo vivia só no estado da tela: recarregar mostrava "desligado"
--    com o cronograma ainda montado em turbo.
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS turbo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS "adaptarDesempenho" BOOLEAN NOT NULL DEFAULT false;

-- 2) pgvector + tabela de trechos indexados (mesmo conteúdo de
--    2026-10-28-rag-pgvector.sql, que nunca chegou a ser rodado).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS material_chunks (
  id           TEXT PRIMARY KEY,
  "materialId" TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  "topicId"    TEXT,
  "subjectId"  TEXT,
  "chunkIndex" INTEGER NOT NULL,
  heading      TEXT,
  content      TEXT NOT NULL,
  tokens       INTEGER NOT NULL,
  embedding    vector(1536),
  model        TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS material_chunks_material_idx
  ON material_chunks ("materialId", "chunkIndex");
CREATE INDEX IF NOT EXISTS material_chunks_topic_idx   ON material_chunks ("topicId");
CREATE INDEX IF NOT EXISTS material_chunks_subject_idx ON material_chunks ("subjectId");

-- HNSW com distância de cosseno. O operador precisa casar com o da query
-- (`<=>` em search.ts); se divergir, o Postgres ignora o índice em silêncio.
CREATE INDEX IF NOT EXISTS material_chunks_embedding_idx
  ON material_chunks USING hnsw (embedding vector_cosine_ops);

-- 3) Conferência — deve mostrar as duas colunas novas e a tabela vazia.
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'study_plans' AND column_name IN ('turbo', 'adaptarDesempenho')) AS colunas_novas,  -- esperado: 2
  (SELECT COUNT(*) FROM material_chunks) AS trechos_indexados,                                              -- esperado: 0
  (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS versao_pgvector;
