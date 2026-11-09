-- Usuário do banco para o servidor MCP: SÓ LEITURA, SÓ as tabelas que as
-- ferramentas usam. Sem acesso a users, payments ou qualquer dado pessoal.
--
-- Mesmo que uma ferramenta tivesse um bug, o banco recusaria escrever ou ler
-- fora disto. É defesa em profundidade: a primeira barreira é o código
-- (ferramentas só fazem SELECT), a segunda é o próprio Postgres.
--
-- Troque a senha antes de rodar. Rode no SQL Editor do Supabase.

CREATE ROLE mcp_leitura WITH LOGIN PASSWORD 'TROQUE-POR-UMA-SENHA-FORTE';

GRANT USAGE ON SCHEMA public TO mcp_leitura;
GRANT SELECT ON
  courses, editais, edital_subjects, subjects, bancas,
  questions, materials, flashcards, topics,
  user_subject_mastery
TO mcp_leitura;
