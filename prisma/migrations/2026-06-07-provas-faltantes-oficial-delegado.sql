-- ════════════════════════════════════════════════════════════════════════════
-- PROVAS FALTANTES — PMDF Oficial, PMGO Oficial, PCDF Delegado, PCDF Papiloscopista
-- Data: 2026-06-07
--
-- Adiciona 8 provas dos cargos que ainda não tinham nada cadastrado.
-- Total esperado pós-rodar: 19 (anteriores) + 8 = 27 provas.
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

-- Garantir bancas adicionais que faltavam (Funiversa pra PCDF Papiloscopista 2013)
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'funiversa', 'Funiversa', 'Fundação Universa (extinta — concursos antigos do DF)', 'Múltipla escolha; questões diretas', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'funiversa');

CREATE OR REPLACE FUNCTION upsert_prova(
  p_course_slug text, p_banca_slug text, p_ano int, p_titulo text, p_cargo text,
  p_etapa text, p_num_questoes int, p_tempo_min int,
  p_pdf_url text, p_gabarito_url text, p_observacoes text
) RETURNS void AS $func$
DECLARE
  v_course_id text; v_banca_id text; v_edital_id text; v_prova_id text;
BEGIN
  SELECT id INTO v_course_id FROM "courses" WHERE slug = p_course_slug;
  IF v_course_id IS NULL THEN
    RAISE NOTICE 'Curso não encontrado: %', p_course_slug;
    RETURN;
  END IF;

  SELECT id INTO v_banca_id FROM "bancas" WHERE slug = p_banca_slug;
  SELECT id INTO v_edital_id FROM "editais"
    WHERE "courseId" = v_course_id AND ano = p_ano LIMIT 1;

  SELECT id INTO v_prova_id FROM "provas"
    WHERE "courseId" = v_course_id AND "bancaId" = v_banca_id AND ano = p_ano
      AND COALESCE(cargo, '') = COALESCE(p_cargo, '') LIMIT 1;

  IF v_prova_id IS NULL THEN
    INSERT INTO "provas" (id, "courseId", "bancaId", "editalId", ano, titulo, cargo, etapa,
                          "numeroQuestoes", "tempoLimiteMinutos", "pdfUrl", "gabaritoUrl",
                          observacoes, "extracaoStatus", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_course_id, v_banca_id, v_edital_id, p_ano, p_titulo, p_cargo, p_etapa,
            p_num_questoes, p_tempo_min, p_pdf_url, p_gabarito_url, p_observacoes, 'PENDENTE', NOW(), NOW());
  ELSE
    UPDATE "provas" SET
      titulo = p_titulo, etapa = COALESCE(p_etapa, etapa),
      "numeroQuestoes" = COALESCE(p_num_questoes, "numeroQuestoes"),
      "tempoLimiteMinutos" = COALESCE(p_tempo_min, "tempoLimiteMinutos"),
      "pdfUrl" = COALESCE(p_pdf_url, "pdfUrl"),
      "gabaritoUrl" = COALESCE(p_gabarito_url, "gabaritoUrl"),
      observacoes = COALESCE(p_observacoes, observacoes),
      "updatedAt" = NOW()
    WHERE id = v_prova_id;
  END IF;
END;
$func$ LANGUAGE plpgsql;

-- ─── PMDF OFICIAL ─────────────────────────────────────────────────────────
SELECT upsert_prova('pmdf-oficial', 'cebraspe', 2026, 'Concurso PMDF 2026 — Oficial (CFO)', 'Oficial Combatente', 'Objetiva',
                    120, 240, 'https://www.cebraspe.org.br/concursos/pmdf_26_oficial', NULL,
                    '147 vagas (49 imediatas + 98 CR). Prova marcada para 14/06/2026. Cebraspe.');

SELECT upsert_prova('pmdf-oficial', 'iades', 2018, 'Concurso PMDF 2018 — Oficial (CFO)', 'Oficial Combatente', 'Objetiva',
                    120, 240, NULL, NULL,
                    'IADES. Edição anterior (CFO).');

-- ─── PMGO OFICIAL ─────────────────────────────────────────────────────────
SELECT upsert_prova('pmgo-oficial', 'instituto-aocp', 2023, 'Concurso PMGO 2023 — Oficial (CFO)', 'Cadete (CFO)', 'Objetiva',
                    100, 240, 'https://www.institutoaocp.org.br/concursos/396', NULL,
                    'Instituto AOCP. CFO PMGO.');

SELECT upsert_prova('pmgo-oficial', 'instituto-aocp', 2018, 'Concurso PMGO 2018 — Oficial (CFO)', 'Cadete (CFO)', 'Objetiva',
                    100, 240, NULL, NULL,
                    'Instituto AOCP. CFO PMGO edição anterior.');

-- ─── PCDF DELEGADO ────────────────────────────────────────────────────────
SELECT upsert_prova('pcdf-delegado', 'cebraspe', 2026, 'Concurso PCDF 2026 — Delegado de Polícia', 'Delegado de Polícia', 'Objetiva',
                    120, 300, 'https://www.cebraspe.org.br/concursos/pc_df_26_delegado', NULL,
                    'Edital fev/2026. Inscrições 7-25/maio/26. Prova 05/07/2026. 150 vagas (50 imediatas + 100 CR). Cebraspe.');

SELECT upsert_prova('pcdf-delegado', 'cebraspe', 2015, 'Concurso PCDF 2015 — Delegado de Polícia', 'Delegado de Polícia', 'Objetiva',
                    120, 300, 'https://www.cebraspe.org.br/concursos/pc_df_15_delegado', NULL,
                    'Cebraspe. Última edição anterior (2015).');

-- ─── PCDF PAPILOSCOPISTA ──────────────────────────────────────────────────
SELECT upsert_prova('pcdf-papiloscopista', 'cebraspe', 2026, 'Concurso PCDF 2026 — Papiloscopista Policial', 'Papiloscopista Policial', 'Objetiva',
                    120, 240, 'https://www.cebraspe.org.br/concursos/pc_df_26_papiloscopista', NULL,
                    'Edital em definição (banca entre FGV/Access/Verbena/IDCAP/Cebraspe). Prova prevista 05/07/2026.');

SELECT upsert_prova('pcdf-papiloscopista', 'funiversa', 2013, 'Concurso PCDF 2013 — Papiloscopista Policial', 'Papiloscopista Policial', 'Objetiva',
                    120, 240, NULL, NULL,
                    'Funiversa (extinta). Edição anterior.');

DROP FUNCTION IF EXISTS upsert_prova(text, text, int, text, text, text, int, int, text, text, text);

DO $$
DECLARE v_count int;
DECLARE v_bancas int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "provas";
  SELECT COUNT(*) INTO v_bancas FROM "bancas";
  RAISE NOTICE 'Total provas: % (esperado 27) | Bancas: % (esperado 7)', v_count, v_bancas;
END $$;
