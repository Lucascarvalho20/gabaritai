-- =====================================================================
-- MIGRATION — Adiciona coluna `legislacao` na tabela materials
-- =====================================================================
-- Objetivo: permitir que cada material de Direito tenha uma lista de
-- links oficiais para a letra da lei no Planalto.
--
-- Estrutura: JSONB com array de objetos {nome, lei, url}
-- Exemplo:
-- [
--   {"nome": "CP art. 121", "lei": "Decreto-Lei 2.848/40", "url": "..."},
--   {"nome": "Lei 13.104/15 - Feminicídio", "lei": "Lei 13.104/15", "url": "..."}
-- ]
-- =====================================================================

-- Adicionar a coluna
ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "legislacao" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Índice GIN para buscar por lei (caso queira filtrar materiais por lei)
CREATE INDEX IF NOT EXISTS "materials_legislacao_gin_idx"
  ON "materials" USING GIN ("legislacao");

-- Comentário descritivo
COMMENT ON COLUMN "materials"."legislacao" IS
  'Lista JSONB de leis citadas no material. Formato: [{nome, lei, url}]. URLs apontam para o Planalto (planalto.gov.br).';

-- =====================================================================
-- FIM da migration
-- =====================================================================
