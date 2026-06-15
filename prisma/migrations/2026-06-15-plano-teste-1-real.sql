-- =====================================================================
-- PLANO DE TESTE — R$ 1,00 (para validar pagamento PIX/cartão de verdade)
-- =====================================================================
-- Oculto do checkout público (isVisible=false). Acesse direto pela URL:
--   https://gabaritai-red.vercel.app/checkout/teste-1-real
--
-- Depois do teste, DESATIVE com o comando no fim do arquivo.
-- Idempotente: pode rodar de novo (ON CONFLICT atualiza).
-- =====================================================================

INSERT INTO "pricing_plans" (
  id, slug, name, description,
  type, interval, "priceCents", "pixDiscount", "moneyBackDays",
  "coverageType", "coverageData", "maxCourses",
  features, "limitTotal", "soldCount",
  active, "isVisible", "sortOrder",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'teste-1-real',
  'Teste R$ 1',
  'Plano interno de teste de pagamento. Não divulgar.',
  'SINGLE_COURSE', 'MONTH', 100, 0, 15,
  'SPECIFIC', '["pf-agente"]'::jsonb, 1,
  '["Plano de teste de pagamento"]'::jsonb, NULL, 0,
  true, false, 999,
  NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  "priceCents" = 100,
  "pixDiscount" = 0,
  "moneyBackDays" = 15,
  "coverageType" = 'SPECIFIC',
  "coverageData" = '["pf-agente"]'::jsonb,
  "maxCourses" = 1,
  active = true,
  "isVisible" = false,
  "updatedAt" = NOW();

-- =====================================================================
-- DEPOIS DO TESTE — desativar o plano (descomente e rode):
-- UPDATE "pricing_plans" SET active = false WHERE slug = 'teste-1-real';
-- =====================================================================
