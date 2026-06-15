-- =====================================================================
-- FIX — Trial "3 dias" → "7 dias" + Garantia 15 dias em todos os planos
-- =====================================================================
-- Corrige textos antigos que apareciam no /planos:
--   - card de trial mostrava "Trial 3 dias / 3 dias grátis"
--   - garantia aparecia como "0 dias"
-- Idempotente.
-- =====================================================================

-- 1) Trial: nome, descrição e duração coerentes com 7 dias
UPDATE "pricing_plans"
SET name        = 'Trial 7 dias',
    description = '7 dias grátis pra você conhecer a plataforma.',
    "moneyBackDays" = 0          -- trial é grátis, não tem reembolso
WHERE type = 'TRIAL' OR slug LIKE 'trial-%';

-- 2) Garantia de 15 dias em todos os planos PAGOS
UPDATE "pricing_plans"
SET "moneyBackDays" = 15
WHERE type <> 'TRIAL';

-- Confere o resultado:
SELECT slug, name, type, "priceCents", "moneyBackDays", active, "isVisible"
FROM "pricing_plans"
ORDER BY "sortOrder";
-- =====================================================================
