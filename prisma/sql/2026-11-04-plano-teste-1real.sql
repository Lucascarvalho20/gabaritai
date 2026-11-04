-- ============================================================================
-- Plano de R$ 1,00 para testar o pagamento de ponta a ponta
--
-- Fica OCULTO da página /planos (isVisible = false), acessível só por link
-- direto. O app já trata esse caso: /checkout/[slug] busca por slug mesmo
-- quando o plano não aparece na listagem pública.
--
-- Limite de 5 compras, para não virar brecha caso o link vaze.
-- ============================================================================


-- ─── PASSO 1 — Ver os cursos ativos (só leitura) ────────────────────────────
-- Anote o slug de um deles; o passo 2 usa o primeiro automaticamente.
SELECT slug, name, active FROM courses WHERE active = true ORDER BY name;


-- ─── PASSO 2 — Criar o plano de teste ───────────────────────────────────────
-- priceCents = 100  → R$ 1,00
-- pixDiscount = 0   → o valor é o mesmo no Pix, no crédito e no débito,
--                     o que facilita conferir se caiu certo
INSERT INTO pricing_plans (
  id, slug, name, description,
  type, interval, "priceCents", "pixDiscount", "moneyBackDays",
  "coverageType", "coverageData", "maxCourses",
  features, badge, "limitTotal", "soldCount",
  active, "isVisible", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'teste-1-real',
  'Teste de pagamento',
  'Plano interno de verificação do checkout. Não divulgar.',
  'SINGLE_COURSE', 'MONTH', 100, 0, 7,
  'SPECIFIC',
  to_jsonb(ARRAY[c.slug]),
  1,
  '["Acesso de teste por 1 mês"]'::jsonb,
  NULL, 5, 0,
  true, false, 999, NOW(), NOW()
FROM courses c
WHERE c.active = true
ORDER BY c.name
LIMIT 1
ON CONFLICT (slug) DO UPDATE
  SET "priceCents" = 100,
      active       = true,
      "isVisible"  = false,
      "limitTotal" = 5;


-- ─── PASSO 3 — Conferir ─────────────────────────────────────────────────────
SELECT slug, name, "priceCents", "coverageData", active, "isVisible",
       "limitTotal", "soldCount"
FROM pricing_plans
WHERE slug = 'teste-1-real';


-- ============================================================================
-- O link do checkout é:
--   https://gabaritai-red.vercel.app/checkout/teste-1-real
--
-- Precisa estar LOGADO — o endpoint devolve 401 sem sessão.
--
-- Depois de cada tentativa (Pix, crédito, débito), rode isto para ver o que
-- o sistema registrou:
--
--   SELECT p.id, p.status, p."paymentMethod", p."amountCents", p."paidAt",
--          p."providerPaymentId", u.email
--   FROM payments p JOIN users u ON u.id = p."userId"
--   ORDER BY p."createdAt" DESC LIMIT 10;
--
-- O que esperar em cada coluna:
--   status PENDING   → criou a cobrança, ainda não pagou
--   status APPROVED  → o webhook chegou, a assinatura foi validada e o
--                      fulfillment rodou (plano + matrícula liberados)
--   paidAt preenchido → é o que impede o webhook duplicado de processar 2x
--
-- Se ficar PENDING depois de pagar, o problema é o webhook não chegar:
-- confira em Mercado Pago → Suas integrações → Webhooks se a URL
-- https://gabaritai-red.vercel.app/api/payments/webhook está cadastrada.
--
-- ─── Para APAGAR o plano quando terminar o teste ───
--   DELETE FROM pricing_plans WHERE slug = 'teste-1-real';
-- ============================================================================
