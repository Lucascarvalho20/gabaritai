-- ════════════════════════════════════════════════════════════════════════════
-- Seed dos PRICING PLANS: singles + duos + trios + all-access
-- Data: 2026-05-31
--
-- Estrutura de combos com os 5 cursos prioritários:
--   pf-agente, pmdf-soldado, prf-policial, pcdf-escrivao, pcdf-agente
--
-- Pricing strategy:
--   - Trial 7d: GRÁTIS
--   - Single: R$ 19,70/mês ou R$ 197/ano (1 curso)
--   - Duo:    R$ 27,70/mês ou R$ 297/ano (2 cursos) — 25% off do par
--   - Trio:   R$ 37,70/mês ou R$ 397/ano (3 cursos) — 33% off
--   - All:    R$ 47,70/mês ou R$ 497/ano (todos)    — 50% off
--   - Vitalício promo: R$ 1.497 once (limitado a 100)
--
-- Pix discount: 10% em tudo (incentiva PIX, evita taxa de cartão).
--
-- IDEMPOTENTE. ON CONFLICT DO UPDATE atualiza preço/features se já existir.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── TRIAL 7 DIAS (grátis) ──────────────────────────────────────────────────
INSERT INTO "pricing_plans" (
  id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays",
  "coverageType", "coverageData", "maxCourses", features, badge, "limitTotal", "soldCount",
  active, "isVisible", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'trial-7d',
  'Trial 7 dias',
  'Teste o Gabaritai com acesso completo por 7 dias. Sem cartão.',
  'TRIAL', 'TRIAL', 0, 0, 0,
  'ALL', NULL, NULL,
  '["Acesso a todos os cursos por 7 dias","Diagnóstico inicial IA","Cronograma personalizado","20 questões por dia","Flashcards SM-2","Resumos NotebookLM"]'::jsonb,
  'Grátis', NULL, 0,
  true, true, 0, NOW(), NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, features = EXCLUDED.features,
  "priceCents" = EXCLUDED."priceCents", "isVisible" = EXCLUDED."isVisible", "updatedAt" = NOW();

-- ─── SINGLE COURSES (5 entradas) ────────────────────────────────────────────
-- Cada single: R$ 197/ano + R$ 19,70/mês (mostramos só anual no checkout)

INSERT INTO "pricing_plans" (id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays", "coverageType", "coverageData", "maxCourses", features, badge, active, "isVisible", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'single-pf-agente', 'PF Agente — Anual',
   'Acesso completo ao curso de PF Agente. 1 ano. Cancela quando quiser.',
   'SINGLE_COURSE', 'YEAR', 19700, 10, 7, 'SPECIFIC', '["pf-agente"]'::jsonb, 1,
   '["1 curso focado","Cronograma IA personalizado","Questões ilimitadas","Flashcards SM-2","Mentor IA 24h","Cancele quando quiser"]'::jsonb,
   NULL, true, true, 10, NOW(), NOW()),

  (gen_random_uuid()::text, 'single-pmdf-soldado', 'PMDF Soldado — Anual',
   'Acesso completo ao curso de PMDF Soldado. 1 ano.',
   'SINGLE_COURSE', 'YEAR', 19700, 10, 7, 'SPECIFIC', '["pmdf-soldado"]'::jsonb, 1,
   '["1 curso focado","Cronograma IA personalizado","Questões ilimitadas","Flashcards SM-2","Mentor IA 24h","Cancele quando quiser"]'::jsonb,
   NULL, true, true, 11, NOW(), NOW()),

  (gen_random_uuid()::text, 'single-prf-policial', 'PRF Policial — Anual',
   'Acesso completo ao curso de PRF. 1 ano.',
   'SINGLE_COURSE', 'YEAR', 19700, 10, 7, 'SPECIFIC', '["prf-policial"]'::jsonb, 1,
   '["1 curso focado","Cronograma IA personalizado","Questões ilimitadas","Flashcards SM-2","Mentor IA 24h","Cancele quando quiser"]'::jsonb,
   NULL, true, true, 12, NOW(), NOW()),

  (gen_random_uuid()::text, 'single-pcdf-escrivao', 'PCDF Escrivão — Anual',
   'Acesso completo ao curso de PCDF Escrivão. 1 ano.',
   'SINGLE_COURSE', 'YEAR', 19700, 10, 7, 'SPECIFIC', '["pcdf-escrivao"]'::jsonb, 1,
   '["1 curso focado","Cronograma IA personalizado","Questões ilimitadas","Flashcards SM-2","Mentor IA 24h","Cancele quando quiser"]'::jsonb,
   NULL, true, true, 13, NOW(), NOW()),

  (gen_random_uuid()::text, 'single-pcdf-agente', 'PCDF Agente — Anual',
   'Acesso completo ao curso de PCDF Agente. 1 ano.',
   'SINGLE_COURSE', 'YEAR', 19700, 10, 7, 'SPECIFIC', '["pcdf-agente"]'::jsonb, 1,
   '["1 curso focado","Cronograma IA personalizado","Questões ilimitadas","Flashcards SM-2","Mentor IA 24h","Cancele quando quiser"]'::jsonb,
   NULL, true, true, 14, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  "priceCents" = EXCLUDED."priceCents", "coverageData" = EXCLUDED."coverageData",
  features = EXCLUDED.features, "updatedAt" = NOW();

-- ─── DUOS (combos de 2 cursos — 25% off) ────────────────────────────────────
INSERT INTO "pricing_plans" (id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays", "coverageType", "coverageData", "maxCourses", features, badge, active, "isVisible", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'combo-federais-policiais', 'Combo Federais Policiais (PF + PRF)',
   'Acesso completo a PF Agente + PRF. Ideal pra quem mira federais policiais.',
   'COMBO', 'YEAR', 29700, 10, 7, 'SPECIFIC', '["pf-agente","prf-policial"]'::jsonb, 2,
   '["PF Agente + PRF","Cronograma alterna entre os 2","Questões + flashcards de ambos","Edital verticalizado dos 2","Mentor IA 24h","Economia de 25% vs separado"]'::jsonb,
   'Recomendado federais', true, true, 20, NOW(), NOW()),

  (gen_random_uuid()::text, 'combo-pcdf-completo', 'Combo PCDF Completo (Escrivão + Agente)',
   'PCDF Escrivão + PCDF Agente. As duas carreiras com a mesma banca.',
   'COMBO', 'YEAR', 29700, 10, 7, 'SPECIFIC', '["pcdf-escrivao","pcdf-agente"]'::jsonb, 2,
   '["PCDF Escrivão + Agente","Conteúdo se sobrepõe — estuda 1x, usa pra 2","Cronograma adaptado","Edital verticalizado","Economia de 25%"]'::jsonb,
   NULL, true, true, 21, NOW(), NOW()),

  (gen_random_uuid()::text, 'combo-pmdf-pcdf-agente', 'Combo Polícia DF (PMDF + PCDF Agente)',
   'PMDF Soldado + PCDF Agente — começa pelas portas de entrada do DF.',
   'COMBO', 'YEAR', 29700, 10, 7, 'SPECIFIC', '["pmdf-soldado","pcdf-agente"]'::jsonb, 2,
   '["PMDF + PCDF Agente","2 portas de entrada DF","Cronograma alterna","Edital verticalizado","Economia de 25%"]'::jsonb,
   NULL, true, true, 22, NOW(), NOW()),

  (gen_random_uuid()::text, 'combo-pf-pmdf', 'Combo PF + PMDF',
   'PF Agente + PMDF Soldado. Federal + estadual de elite.',
   'COMBO', 'YEAR', 29700, 10, 7, 'SPECIFIC', '["pf-agente","pmdf-soldado"]'::jsonb, 2,
   '["PF Agente + PMDF","Federal + DF","Cronograma alterna","Edital verticalizado","Economia de 25%"]'::jsonb,
   NULL, true, true, 23, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  "priceCents" = EXCLUDED."priceCents", "coverageData" = EXCLUDED."coverageData",
  features = EXCLUDED.features, badge = EXCLUDED.badge, "updatedAt" = NOW();

-- ─── TRIOS (combos de 3 cursos — 33% off) ───────────────────────────────────
INSERT INTO "pricing_plans" (id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays", "coverageType", "coverageData", "maxCourses", features, badge, active, "isVisible", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'combo-df-total', 'Trio DF (PMDF + PCDF Escrivão + PCDF Agente)',
   'O combo do DF: PMDF + PCDF Escrivão + PCDF Agente. Multiplique suas chances no DF.',
   'COMBO', 'YEAR', 39700, 10, 7, 'SPECIFIC', '["pmdf-soldado","pcdf-escrivao","pcdf-agente"]'::jsonb, 3,
   '["3 cursos do DF","PMDF + PCDF Escrivão + Agente","Conteúdo se sobrepõe muito","Cronograma alterna entre 3","Mentor IA 24h","Economia de 33%"]'::jsonb,
   'Top DF', true, true, 30, NOW(), NOW()),

  (gen_random_uuid()::text, 'combo-federais-completo', 'Trio Federais (PF + PRF + PCDF Agente)',
   'PF + PRF + PCDF Agente. Cobertura completa de federais policiais + DF.',
   'COMBO', 'YEAR', 39700, 10, 7, 'SPECIFIC', '["pf-agente","prf-policial","pcdf-agente"]'::jsonb, 3,
   '["3 cursos","PF Agente + PRF + PCDF Agente","Cobertura ampla","Cronograma adaptado","Mentor IA 24h","Economia de 33%"]'::jsonb,
   NULL, true, true, 31, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  "priceCents" = EXCLUDED."priceCents", "coverageData" = EXCLUDED."coverageData",
  features = EXCLUDED.features, badge = EXCLUDED.badge, "updatedAt" = NOW();

-- ─── ALL ACCESS ANUAL (50% off) ─────────────────────────────────────────────
INSERT INTO "pricing_plans" (id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays", "coverageType", "coverageData", "maxCourses", features, badge, active, "isVisible", "sortOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text, 'full-access-anual',
  'Full Access Anual (TODOS os cursos)',
  'Acesso a TODOS os cursos cadastrados (atuais e futuros). 1 ano completo.',
  'FULL_ACCESS', 'YEAR', 49700, 10, 7, 'ALL', NULL, NULL,
  '["Todos os cursos atuais e futuros","Diagnóstico IA pra cada um","Cronograma com múltiplos cursos","Mentor IA prioritário 24h","Acesso antecipado a novos cursos","Suporte VIP","Economia >50% vs comprar separado"]'::jsonb,
  'Mais popular', true, true, 40, NOW(), NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  "priceCents" = EXCLUDED."priceCents", features = EXCLUDED.features,
  badge = EXCLUDED.badge, "coverageType" = EXCLUDED."coverageType", "updatedAt" = NOW();

-- ─── VITALÍCIO PROMO (limitado, escassez) ───────────────────────────────────
INSERT INTO "pricing_plans" (id, slug, name, description, type, interval, "priceCents", "pixDiscount", "moneyBackDays", "coverageType", "coverageData", "maxCourses", features, badge, "limitTotal", "soldCount", active, "isVisible", "sortOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text, 'vitalicio-promo-100',
  'Vitalício Promo — 100 vagas',
  'Acesso vitalício a todos os cursos. Pagamento único. Apenas 100 vagas pra primeiros early adopters.',
  'VITALICIO_PROMO', 'LIFETIME', 149700, 10, 14, 'ALL', NULL, NULL,
  '["Acesso VITALÍCIO a tudo","Todos os cursos atuais e futuros","Pagamento único, nunca mais paga","Suporte VIP vitalício","Acesso beta a features novas","Apenas 100 vagas"]'::jsonb,
  'Limitado', 100, 0, true, true, 50, NOW(), NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  "priceCents" = EXCLUDED."priceCents", features = EXCLUDED.features,
  badge = EXCLUDED.badge, "limitTotal" = EXCLUDED."limitTotal", "updatedAt" = NOW();

-- Verifica resultado
-- SELECT slug, name, type, "priceCents", "coverageType", "coverageData"
--   FROM "pricing_plans"
--   WHERE active = true AND "isVisible" = true
--   ORDER BY "sortOrder";
