-- ════════════════════════════════════════════════════════════════════════════
-- CLEANUP OPCIONAL — Subjects órfãos do seed antigo
-- Data: 2026-06-03
--
-- Objetivo: Deletar subjects que NÃO estão sendo usados em lugar nenhum
-- (0 edital_subjects, 0 course_subjects, 0 topics, 0 questions ativas).
--
-- CONSERVADOR: usa DELETE com filtro estrito de "totalmente órfão" — não
-- arrisca remover nada em uso.
--
-- IDEMPOTENTE: pode rodar quantas vezes quiser. Se subject estiver em uso,
-- não é deletado.
--
-- Esta migration é OPCIONAL. Rode só se quiser limpar o schema. NÃO afeta
-- funcionalidade — apenas remove ruído visual no admin/relatórios.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Lista os subjects órfãos (preview antes do delete)
-- ──────────────────────────────────────────────────────────────────────────
SELECT s.slug, s.name,
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "subjectId" = s.id) AS em_editais,
       (SELECT COUNT(*) FROM "course_subjects" WHERE "subjectId" = s.id) AS em_cursos,
       (SELECT COUNT(*) FROM "topics" WHERE "subjectId" = s.id) AS topicos,
       (SELECT COUNT(*) FROM "questions" WHERE "subjectId" = s.id AND active = true) AS questoes_ativas
FROM "subjects" s
WHERE NOT EXISTS (SELECT 1 FROM "edital_subjects" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "course_subjects" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "questions" WHERE "subjectId" = s.id AND active = true)
ORDER BY s.name;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Deleta subjects totalmente órfãos
--    (Se quiser preservar pra inspeção, comente este bloco)
-- ──────────────────────────────────────────────────────────────────────────
DELETE FROM "subjects" s
WHERE NOT EXISTS (SELECT 1 FROM "edital_subjects" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "course_subjects" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id)
  AND NOT EXISTS (SELECT 1 FROM "questions" WHERE "subjectId" = s.id);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Verifica resultado: subjects restantes (deve estar enxuto agora)
-- ──────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS subjects_restantes FROM "subjects";

-- Lista os 20 subjects mais usados (sanidade)
SELECT s.slug, s.name,
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "subjectId" = s.id) AS em_editais,
       (SELECT COUNT(*) FROM "course_subjects" WHERE "subjectId" = s.id) AS em_cursos
FROM "subjects" s
ORDER BY (SELECT COUNT(*) FROM "edital_subjects" WHERE "subjectId" = s.id) DESC
LIMIT 20;
