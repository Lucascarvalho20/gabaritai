-- ════════════════════════════════════════════════════════════════════════════
-- PROVAS ANTERIORES — TUDO EM UM (infra + metadados)
-- Data: 2026-06-07
--
-- SUBSTITUI os 2 arquivos anteriores. Roda essa única vez:
--   1. ALTER provas (adiciona colunas faltantes)
--   2. CREATE TABLE prova_attempts (histórico do aluno)
--   3. INSERT bancas (cebraspe, instituto-aocp, iades, vunesp, fgv, idecan)
--   4. INSERT 19 provas (PF/PRF/PCDF/PMDF/PMGO)
--
-- IDEMPOTENTE — pode rodar várias vezes sem problema.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PARTE 1: Colunas faltantes em provas ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'numeroQuestoes') THEN
    ALTER TABLE "provas" ADD COLUMN "numeroQuestoes" int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'tempoLimiteMinutos') THEN
    ALTER TABLE "provas" ADD COLUMN "tempoLimiteMinutos" int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'gabaritoOficialPublicadoEm') THEN
    ALTER TABLE "provas" ADD COLUMN "gabaritoOficialPublicadoEm" timestamp;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'observacoes') THEN
    ALTER TABLE "provas" ADD COLUMN "observacoes" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'extracaoStatus') THEN
    ALTER TABLE "provas" ADD COLUMN "extracaoStatus" text DEFAULT 'PENDENTE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provas' AND column_name = 'updatedAt') THEN
    ALTER TABLE "provas" ADD COLUMN "updatedAt" timestamp DEFAULT NOW();
  END IF;
END $$;

-- ─── PARTE 2: Tabela prova_attempts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "prova_attempts" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "provaId" text NOT NULL,
  "startedAt" timestamp NOT NULL DEFAULT NOW(),
  "finishedAt" timestamp,
  "durationSec" int,
  "respostas" jsonb NOT NULL DEFAULT '{}',
  "totalQuestoes" int,
  "totalCorretas" int,
  "totalErradas" int,
  "totalAnuladas" int,
  "totalEmBranco" int,
  "notaBruta" decimal(5,2),
  "notaComAnuladas" decimal(5,2),
  "completed" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),

  CONSTRAINT "prova_attempts_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "prova_attempts_prova_fk" FOREIGN KEY ("provaId") REFERENCES "provas"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "prova_attempts_user_idx" ON "prova_attempts"("userId");
CREATE INDEX IF NOT EXISTS "prova_attempts_prova_idx" ON "prova_attempts"("provaId");
CREATE INDEX IF NOT EXISTS "prova_attempts_user_prova_idx" ON "prova_attempts"("userId", "provaId");

-- ─── PARTE 3: Bancas ───────────────────────────────────────────────────────
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'cebraspe', 'Cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção', 'C/E (Certo/Errado); texto-base extenso; muita jurisprudência STF/STJ', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'cebraspe');

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'instituto-aocp', 'Instituto AOCP', 'Banca de concursos militares e municipais', 'Múltipla escolha; questões diretas e literais', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'instituto-aocp');

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'iades', 'IADES', 'Instituto Americano de Desenvolvimento', 'Múltipla escolha com gabarito direto', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'iades');

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'vunesp', 'Vunesp', 'Fundação Vunesp — banca paulista', 'Múltipla escolha equilibrada teoria/prática', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'vunesp');

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'fgv', 'FGV', 'Fundação Getúlio Vargas', 'Múltipla escolha com pegada acadêmica', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'fgv');

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
SELECT gen_random_uuid()::text, 'idecan', 'IDECAN', 'Instituto de Desenvolvimento Educacional, Cultural e Assistencial Nacional', 'Múltipla escolha mista (literal e analítica)', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "bancas" WHERE slug = 'idecan');

-- ─── PARTE 4: Helper upsert_prova ──────────────────────────────────────────
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

-- ─── PARTE 5: Cadastro das 19 provas ───────────────────────────────────────

-- PF 2025 (5 cargos)
SELECT upsert_prova('pf-delegado', 'cebraspe', 2025, 'Concurso PF 2025 — Delegado de Polícia Federal', 'Delegado', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_25', 'https://www.cebraspe.org.br/concursos/pf_25', 'Prova aplicada em 27/07/2025. 1000 vagas no total do edital.');
SELECT upsert_prova('pf-agente', 'cebraspe', 2025, 'Concurso PF 2025 — Agente de Polícia Federal', 'Agente', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_25', 'https://www.cebraspe.org.br/concursos/pf_25', 'Prova aplicada em 27/07/2025.');
SELECT upsert_prova('pf-escrivao', 'cebraspe', 2025, 'Concurso PF 2025 — Escrivão de Polícia Federal', 'Escrivão', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_25', 'https://www.cebraspe.org.br/concursos/pf_25', 'Prova aplicada em 27/07/2025.');
SELECT upsert_prova('pf-perito', 'cebraspe', 2025, 'Concurso PF 2025 — Perito Criminal Federal', 'Perito Criminal', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_25', 'https://www.cebraspe.org.br/concursos/pf_25', 'Prova aplicada em 27/07/2025.');
SELECT upsert_prova('pf-papiloscopista', 'cebraspe', 2025, 'Concurso PF 2025 — Papiloscopista Policial Federal', 'Papiloscopista', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_25', 'https://www.cebraspe.org.br/concursos/pf_25', 'Prova aplicada em 27/07/2025.');

-- PF 2021 (4 cargos)
SELECT upsert_prova('pf-delegado', 'cebraspe', 2021, 'Concurso PF 2021 — Delegado de Polícia Federal', 'Delegado', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_21', 'https://www.cebraspe.org.br/concursos/pf_21', '1500 vagas no total. Cebraspe. Prova aplicada em maio/2021.');
SELECT upsert_prova('pf-agente', 'cebraspe', 2021, 'Concurso PF 2021 — Agente de Polícia Federal', 'Agente', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_21', 'https://www.cebraspe.org.br/concursos/pf_21', '893 vagas pra Agente.');
SELECT upsert_prova('pf-escrivao', 'cebraspe', 2021, 'Concurso PF 2021 — Escrivão de Polícia Federal', 'Escrivão', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_21', 'https://www.cebraspe.org.br/concursos/pf_21', '400 vagas pra Escrivão.');
SELECT upsert_prova('pf-papiloscopista', 'cebraspe', 2021, 'Concurso PF 2021 — Papiloscopista Policial Federal', 'Papiloscopista', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_21', 'https://www.cebraspe.org.br/concursos/pf_21', '84 vagas.');

-- PF 2018
SELECT upsert_prova('pf-delegado', 'cebraspe', 2018, 'Concurso PF 2018 — Delegado de Polícia Federal', 'Delegado', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pf_18', NULL, '500 vagas iniciais. 147.744 inscritos.');

-- PRF
SELECT upsert_prova('prf', 'cebraspe', 2021, 'Concurso PRF 2021 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, 'https://www.cebraspe.org.br/concursos/prf_21', 'https://www.cebraspe.org.br/concursos/prf_21', 'Aplicada em 09/05/2021. Bloco I (55) + II (30) + III (35).');
SELECT upsert_prova('prf', 'cebraspe', 2019, 'Concurso PRF 2019 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, NULL, NULL, 'Edição 2019.');
SELECT upsert_prova('prf', 'cebraspe', 2013, 'Concurso PRF 2013 — Policial Rodoviário Federal', 'Policial Rodoviário Federal', 'Objetiva', 120, 300, 'http://www.cespe.unb.br/concursos/dprf_13/', NULL, 'Cespe/UnB (atual Cebraspe).');

-- PCDF
SELECT upsert_prova('pcdf-agente', 'cebraspe', 2020, 'Concurso PCDF 2020 — Agente de Polícia', 'Agente de Polícia', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pc_df_20_agente', NULL, 'Cargo: Agente de Polícia.');
SELECT upsert_prova('pcdf-escrivao', 'cebraspe', 2019, 'Concurso PCDF 2019 — Escrivão de Polícia', 'Escrivão de Polícia', 'Objetiva', 120, 240, 'https://www.cebraspe.org.br/concursos/pc_df_19_escrivao', NULL, 'Cebraspe.');
SELECT upsert_prova('pcdf-perito', 'iades', 2016, 'Concurso PCDF 2016 — Perito Criminal', 'Perito Criminal', 'Objetiva', 120, 240, NULL, NULL, 'IADES.');

-- PMDF
SELECT upsert_prova('pmdf-soldado', 'iades', 2023, 'Concurso PMDF 2023 — Soldado PM 2ª Classe', 'Soldado PM 2ª Classe', 'Objetiva', 100, 240, NULL, NULL, 'IADES.');
SELECT upsert_prova('pmdf-soldado', 'instituto-aocp', 2022, 'Concurso PMDF 2022 — Soldado PM (AOCP)', 'Soldado PM', 'Objetiva', 100, 240, 'https://arquivos.qconcursos.com/prova/arquivo_prova/94076/instituto-aocp-2023-pm-df-soldado-policial-militar-da-policia-militar-do-distrito-federal-qppmc-prova.pdf', NULL, 'Instituto AOCP. Edital 002/2022.');

-- PMGO
SELECT upsert_prova('pmgo-soldado', 'instituto-aocp', 2024, 'Concurso PMGO 2024 — Soldado QPPM Combatente', 'Soldado QPPM Combatente', 'Objetiva', 100, 240, 'https://www.institutoaocp.org.br/concursos/400', NULL, 'Instituto AOCP. Edital 002/2022 — aplicada em 2024.');

-- ─── PARTE 6: Cleanup ──────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS upsert_prova(text, text, int, text, text, text, int, int, text, text, text);

-- ─── PARTE 7: Resumo ───────────────────────────────────────────────────────
DO $$
DECLARE v_provas int;
DECLARE v_attempts int;
DECLARE v_bancas int;
BEGIN
  SELECT COUNT(*) INTO v_provas FROM "provas";
  SELECT COUNT(*) INTO v_attempts FROM "prova_attempts";
  SELECT COUNT(*) INTO v_bancas FROM "bancas";
  RAISE NOTICE 'OK. Bancas: % | Provas: % | Tentativas: %', v_bancas, v_provas, v_attempts;
END $$;
