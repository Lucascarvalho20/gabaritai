-- ════════════════════════════════════════════════════════════════════════════
-- FIX — Adiciona as 3 provas do PRF que faltaram
-- Data: 2026-06-07
--
-- Bug: o SQL anterior usou slug 'prf' mas o curso real é 'prf-policial'.
-- Esse arquivo corrige isso adicionando as 3 provas do PRF (2021, 2019, 2013).
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

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

-- PRF 2021, 2019, 2013 (slug correto: prf-policial)
SELECT upsert_prova('prf-policial', 'cebraspe', 2021, 'Concurso PRF 2021 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, 'https://www.cebraspe.org.br/concursos/prf_21', 'https://www.cebraspe.org.br/concursos/prf_21', 'Aplicada em 09/05/2021. Bloco I (55) + II (30) + III (35).');
SELECT upsert_prova('prf-policial', 'cebraspe', 2019, 'Concurso PRF 2019 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, NULL, NULL, 'Edição 2019.');
SELECT upsert_prova('prf-policial', 'cebraspe', 2013, 'Concurso PRF 2013 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, 'http://www.cespe.unb.br/concursos/dprf_13/', NULL, 'Cespe/UnB (atual Cebraspe).');

DROP FUNCTION IF EXISTS upsert_prova(text, text, int, text, text, text, int, int, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "provas";
  RAISE NOTICE 'Total provas no DB: % (deve ser 19)', v_count;
END $$;
