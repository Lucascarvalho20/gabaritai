-- ============================================================================
-- RAG: busca semântica sobre os materiais
--
-- Rodar no SQL Editor do Supabase. É idempotente: pode rodar de novo sem quebrar.
-- (Supabase vai perguntar sobre RLS — este projeto não usa RLS, então "Run without RLS".)
-- ============================================================================

-- 1) pgvector. Já vem disponível no Supabase, só precisa habilitar.
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Tabela de trechos indexados.
CREATE TABLE IF NOT EXISTS material_chunks (
  id          TEXT PRIMARY KEY,
  "materialId" TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  "topicId"   TEXT,
  "subjectId" TEXT,
  "chunkIndex" INTEGER NOT NULL,
  heading     TEXT,
  content     TEXT NOT NULL,
  tokens      INTEGER NOT NULL,
  embedding   vector(1536),
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Um trecho por posição dentro de cada material. Permite reindexar com UPSERT
-- em vez de apagar e recriar (que geraria ids novos a cada execução).
CREATE UNIQUE INDEX IF NOT EXISTS material_chunks_material_idx
  ON material_chunks ("materialId", "chunkIndex");

CREATE INDEX IF NOT EXISTS material_chunks_topic_idx   ON material_chunks ("topicId");
CREATE INDEX IF NOT EXISTS material_chunks_subject_idx ON material_chunks ("subjectId");

-- 3) Índice vetorial HNSW para distância de cosseno.
--
-- Por que HNSW e não IVFFlat: o IVFFlat precisa ser construído DEPOIS de a tabela
-- já ter dados representativos (ele calcula centroides), e precisa ser reconstruído
-- conforme a base cresce. O HNSW não tem esse problema — pode ser criado com a
-- tabela vazia e se mantém sozinho. Custa mais memória, mas numa base deste tamanho
-- isso não pesa.
--
-- vector_cosine_ops precisa casar com o operador usado na query (`<=>` em search.ts).
-- Se divergir, o Postgres ignora o índice silenciosamente e faz varredura completa.
CREATE INDEX IF NOT EXISTS material_chunks_embedding_idx
  ON material_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- Conferência
-- ============================================================================
-- SELECT COUNT(*) AS total,
--        COUNT(embedding) AS com_embedding,
--        COUNT(*) - COUNT(embedding) AS pendentes
-- FROM material_chunks;
