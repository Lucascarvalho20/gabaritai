-- ════════════════════════════════════════════════════════════════════════════
-- Garante os 5 cursos prioritários existem no banco
-- Data: 2026-05-30
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → Cola tudo → Run
--
-- Idempotente: pode rodar quantas vezes quiser. ON CONFLICT DO NOTHING.
--
-- Depois de rodar, vai em /admin/editais/extrair e sobe o PDF do edital
-- oficial mais recente de cada um. O sistema vai criar matérias, pesos,
-- banca etc. automaticamente via IA Vision (Gemini).
-- ════════════════════════════════════════════════════════════════════════════

-- 5 cursos prioritários (decidido 2026-05-30)
INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
VALUES
  (
    gen_random_uuid()::text,
    'pf-agente',
    'PF — Agente de Polícia Federal',
    'Carreira de nível superior na Polícia Federal. Banca Cebraspe (CESPE). Estilo Certo/Errado.',
    'POLICIAL',
    'BR',
    'Polícia Federal',
    'Agente de Polícia Federal',
    'pf',
    true,
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'pmdf-soldado',
    'PMDF — Soldado',
    'Polícia Militar do Distrito Federal. Banca Cebraspe (CESPE).',
    'POLICIAL',
    'DF',
    'Polícia Militar do DF',
    'Soldado',
    'pmdf',
    true,
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'prf-policial',
    'PRF — Policial Rodoviário Federal',
    'Polícia Rodoviária Federal. Banca Cebraspe (CESPE).',
    'POLICIAL',
    'BR',
    'Polícia Rodoviária Federal',
    'Policial Rodoviário Federal',
    'prf',
    true,
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'pcdf-escrivao',
    'PCDF — Escrivão de Polícia',
    'Polícia Civil do Distrito Federal. Banca Cebraspe.',
    'POLICIAL',
    'DF',
    'Polícia Civil do DF',
    'Escrivão de Polícia',
    'pcdf',
    true,
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'pcdf-agente',
    'PCDF — Agente de Polícia',
    'Polícia Civil do Distrito Federal. Banca Cebraspe.',
    'POLICIAL',
    'DF',
    'Polícia Civil do DF',
    'Agente de Polícia',
    'pcdf',
    true,
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;

-- Garante Bancas existem com style hint (alimenta prompt da IA do diagnóstico)
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES
  (
    gen_random_uuid()::text,
    'cebraspe',
    'Cebraspe (CESPE)',
    'Centro Brasileiro de Pesquisa em Avaliação e Seleção. Banca clássica de concursos federais e policiais.',
    'Itens CERTO/ERRADO. Cada item é uma afirmação a julgar (binário, sem alternativas A-E). Errada anula certa em geral. Conceitual, foca em pegadinhas de detalhe técnico. Linguagem formal, cita lei seca e doutrina majoritária.',
    true,
    NOW()
  )
ON CONFLICT (slug) DO UPDATE SET
  style = EXCLUDED.style,
  description = EXCLUDED.description;

-- Verifica resultado
-- SELECT slug, name, orgao FROM "courses" WHERE slug IN ('pf-agente','pmdf-soldado','prf-policial','pcdf-escrivao','pcdf-agente');
