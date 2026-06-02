-- ════════════════════════════════════════════════════════════════════════════
-- CLEANUP PMDF SOLDADO — Remove 6 subjects antigos do edital 04/2023
-- + Deleta edital fantasma (numero IS NULL)
-- Data: 2026-06-01
--
-- CONTEXTO: seed antigo do pmdf-soldado criou:
--   1) Um edital sem número (fantasma) com 1 subject
--   2) 6 EditalSubjects no edital 04/2023 com subjects "Noções de..." e
--      "Legislação Aplicável..." que duplicam os meus subjects canônicos
--      ("Direito ..." e "Legislação Aplicada à PMDF").
--
-- ESTRATÉGIA CONSERVADORA: Apenas DESVINCULA os 6 subjects antigos do edital
-- 04/2023 (DELETE em edital_subjects). NÃO deleta os subjects globais porque
-- podem estar em uso em OUTROS editais/cursos (PF, PRF, PCDF). Se quisermos
-- consolidar globalmente depois, fazemos migration separada.
--
-- IDEMPOTENTE: pode rodar várias vezes sem efeito colateral.
--
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → cola tudo → Run.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Remove 6 EditalSubjects antigos (que apontam pros subjects duplicados)
--    do edital 04/2023 do curso pmdf-soldado
-- ──────────────────────────────────────────────────────────────────────────
DELETE FROM "edital_subjects"
WHERE "editalId" IN (
  SELECT e.id FROM "editais" e
  JOIN "courses" c ON c.id = e."courseId"
  WHERE c.slug = 'pmdf-soldado' AND e.numero = '04/2023'
)
AND "subjectId" IN (
  SELECT id FROM "subjects" WHERE slug IN (
    'legislacao-aplicavel-a-policia-militar-do-distrito-federal',
    'nocoes-de-direito-constitucional-e-de-direitos-humanos',
    'nocoes-de-direito-administrativo',
    'nocoes-de-direito-processual-penal-1-nocoes-introdutorias',
    'nocoes-de-direito-penal-militar',
    'nocoes-de-direito-processual-penal-militar'
  )
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Remove COURSE_SUBJECTS antigos (mesmos 6 subjects no curso pmdf-soldado)
--    pra evitar que o cronograma/dashboard mostre matérias duplicadas
-- ──────────────────────────────────────────────────────────────────────────
DELETE FROM "course_subjects"
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
AND "subjectId" IN (
  SELECT id FROM "subjects" WHERE slug IN (
    'legislacao-aplicavel-a-policia-militar-do-distrito-federal',
    'nocoes-de-direito-constitucional-e-de-direitos-humanos',
    'nocoes-de-direito-administrativo',
    'nocoes-de-direito-processual-penal-1-nocoes-introdutorias',
    'nocoes-de-direito-penal-militar',
    'nocoes-de-direito-processual-penal-militar'
  )
);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Deleta edital fantasma (numero IS NULL) e seus edital_subjects órfãos
-- ──────────────────────────────────────────────────────────────────────────
-- Primeiro remove edital_subjects vinculados ao edital fantasma (CASCADE garante mas explícito é mais seguro)
DELETE FROM "edital_subjects"
WHERE "editalId" IN (
  SELECT e.id FROM "editais" e
  JOIN "courses" c ON c.id = e."courseId"
  WHERE c.slug = 'pmdf-soldado' AND e.numero IS NULL
);

-- Deleta o próprio edital fantasma
DELETE FROM "editais"
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
  AND numero IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — resultado esperado: 1 row (04/2023, true, 80, true, 12, 80)
-- ════════════════════════════════════════════════════════════════════════════
SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pmdf-soldado';

-- E lista as 12 matérias finais ordenadas:
SELECT s.name AS materia, s.slug, es."expectedQuestions" AS questoes, es.weight, es."order"
FROM "edital_subjects" es
JOIN "subjects" s ON s.id = es."subjectId"
JOIN "editais" e ON e.id = es."editalId"
WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
  AND e.numero = '04/2023'
ORDER BY es."order";
