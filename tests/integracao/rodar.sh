#!/usr/bin/env bash
# Sobe um Postgres + pgvector descartável, prepara o schema EXATAMENTE como a
# produção (Prisma + o SQL de migration manual) e roda os testes de integração.
# O container é removido no fim, passe o teste ou não.
set -euo pipefail
cd "$(dirname "$0")/../.."

NOME=gabaritai_teste_integracao
PORTA=55433
URL="postgresql://postgres:teste@localhost:${PORTA}/teste"

docker rm -f "$NOME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NOME" -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=teste -p "${PORTA}:5432" pgvector/pgvector:pg16 >/dev/null
trap 'docker rm -f "$NOME" >/dev/null 2>&1 || true' EXIT

until docker exec "$NOME" pg_isready -U postgres >/dev/null 2>&1; do sleep 0.5; done

docker exec "$NOME" psql -U postgres -d teste -qc 'CREATE EXTENSION IF NOT EXISTS vector;'
DATABASE_URL="$URL" npx prisma db push --skip-generate --accept-data-loss >/dev/null
# O índice HNSW não existe no schema do Prisma: vem do SQL, como em produção.
docker exec -i "$NOME" psql -U postgres -d teste -q -v ON_ERROR_STOP=1 < prisma/sql/2026-11-09-cronograma-adaptativo-e-rag.sql >/dev/null

INTEGRACAO_DATABASE_URL="$URL" node --experimental-transform-types --no-warnings \
  --import ./scripts/alias/registrar.mjs ./tests/integracao/integracao.mts
