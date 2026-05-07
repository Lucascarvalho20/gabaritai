-- GabaritAI — Schema Supabase
-- Execute este SQL no Supabase Dashboard → SQL Editor

-- ─── USUÁRIOS ────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            text primary key,         -- mesmo id do demo-users.ts
  email         text unique not null,
  name          text not null,
  plan          text default 'FREE',       -- FREE | BASIC | PREMIUM | LIFETIME
  courses       text[] default '{}',       -- array de courseIds
  concurso_alvo text default '',
  nivel         text default 'intermediario',
  horas_dia     text default '3',
  meta          text default '',
  role          text default 'STUDENT',    -- ADMIN | STUDENT
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── QUESTÕES RESPONDIDAS ────────────────────────────────────────────────────
create table if not exists public.questoes_respondidas (
  id              uuid primary key default gen_random_uuid(),
  user_id         text references public.users(id) on delete cascade,
  curso_id        text not null,
  materia_id      text not null,
  enunciado_hash  text,                   -- hash do enunciado para deduplicar
  correta         boolean not null,
  tempo_segundos  integer default 0,
  created_at      timestamptz default now()
);
create index if not exists idx_questoes_user_curso on public.questoes_respondidas(user_id, curso_id);
create index if not exists idx_questoes_created on public.questoes_respondidas(created_at);

-- ─── FLASHCARDS REVISADOS ────────────────────────────────────────────────────
create table if not exists public.flashcards_revisados (
  id          uuid primary key default gen_random_uuid(),
  user_id     text references public.users(id) on delete cascade,
  curso_id    text not null,
  materia_id  text not null,
  frente      text not null,
  verso       text not null,
  rating      integer check (rating between 1 and 5),   -- 1=não sei, 5=sei bem
  created_at  timestamptz default now()
);
create index if not exists idx_flash_user_curso on public.flashcards_revisados(user_id, curso_id);

-- ─── SIMULADOS FEITOS ────────────────────────────────────────────────────────
create table if not exists public.simulados_feitos (
  id               uuid primary key default gen_random_uuid(),
  user_id          text references public.users(id) on delete cascade,
  curso_id         text not null,
  tipo             text not null,          -- 'mini-facil' | 'mini-medio' | 'mini-dificil' | 'real'
  total_questoes   integer not null,
  corretas         integer not null,
  acerto_pct       numeric(5,2) not null,
  duracao_segundos integer default 0,
  resultados_json  jsonb,                  -- array com cada questão + resposta
  created_at       timestamptz default now()
);
create index if not exists idx_simulados_user on public.simulados_feitos(user_id, curso_id);

-- ─── CRONOGRAMA ──────────────────────────────────────────────────────────────
create table if not exists public.cronogramas (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text references public.users(id) on delete cascade unique,
  configuracao_json  jsonb not null default '{}',
  horas_dia          numeric(4,1) default 3,
  dias_semana        integer[] default '{1,2,3,4,5}',   -- 0=dom...6=sab
  data_prova         date,
  updated_at         timestamptz default now()
);

-- ─── MENSAGENS DO MENTOR IA ──────────────────────────────────────────────────
create table if not exists public.mentor_mensagens (
  id          uuid primary key default gen_random_uuid(),
  user_id     text references public.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  provider    text,                        -- 'groq' | 'gemini' | 'claude' | 'fallback'
  created_at  timestamptz default now()
);
create index if not exists idx_mentor_user on public.mentor_mensagens(user_id, created_at);

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────
-- Habilita RLS em todas as tabelas
alter table public.users                enable row level security;
alter table public.questoes_respondidas enable row level security;
alter table public.flashcards_revisados enable row level security;
alter table public.simulados_feitos     enable row level security;
alter table public.cronogramas          enable row level security;
alter table public.mentor_mensagens     enable row level security;

-- Políticas: usuário vê apenas seus próprios dados
-- (por enquanto usando anon key com service role bypass)
-- Para produção real, integrar com Supabase Auth

-- Permite tudo via service role (backend)
create policy "service_role_all_users" on public.users for all using (true);
create policy "service_role_all_questoes" on public.questoes_respondidas for all using (true);
create policy "service_role_all_flash" on public.flashcards_revisados for all using (true);
create policy "service_role_all_simulados" on public.simulados_feitos for all using (true);
create policy "service_role_all_cronograma" on public.cronogramas for all using (true);
create policy "service_role_all_mentor" on public.mentor_mensagens for all using (true);

-- ─── VIEWS ÚTEIS PARA O ADMIN ────────────────────────────────────────────────
create or replace view public.admin_stats as
select
  (select count(*) from public.users where role = 'STUDENT') as total_alunos,
  (select count(*) from public.users where plan = 'LIFETIME') as vitalicio,
  (select count(*) from public.users where plan = 'PREMIUM') as premium,
  (select count(*) from public.questoes_respondidas) as total_questoes_respondidas,
  (select count(*) from public.simulados_feitos) as total_simulados,
  (select count(*) from public.flashcards_revisados) as total_flashcards_revisados,
  (select avg(acerto_pct) from public.simulados_feitos) as media_acerto_simulados;

-- View de desempenho por curso
create or replace view public.desempenho_por_curso as
select
  curso_id,
  count(*) as total_respondidas,
  sum(case when correta then 1 else 0 end) as corretas,
  round(100.0 * sum(case when correta then 1 else 0 end) / count(*), 1) as acerto_pct
from public.questoes_respondidas
group by curso_id
order by acerto_pct;

-- Inserir usuários demo na tabela (execute após criar a tabela)
insert into public.users (id, email, name, plan, courses, concurso_alvo, nivel, horas_dia, meta, role)
values
  ('admin-001', 'admin@gabaritai.com.br', 'João Lucas — Admin', 'LIFETIME', '{}', 'Administração', 'avancado', '8', 'Gerenciar a plataforma GabaritAI.', 'ADMIN'),
  ('beta-full-001', 'beta@gabaritai.com.br', 'Beta Tester — Acesso Total', 'LIFETIME', '{}', 'Todos os cursos', 'intermediario', '4', 'Testar todas as funcionalidades.', 'STUDENT'),
  ('beta-pmdf-001', 'pmdf@gabaritai.com.br', 'Beta Tester — PMDF Soldado', 'PREMIUM', '{"pmdf-soldado"}', 'PMDF — Soldado', 'intermediario', '4', 'Ser aprovado no PMDF.', 'STUDENT'),
  ('beta-pf-001', 'pf@gabaritai.com.br', 'Beta Tester — PF + PRF', 'PREMIUM', '{"pf-agente","prf-policial"}', 'Polícia Federal', 'basico', '3', 'Passar na PF ou PRF.', 'STUDENT'),
  ('beta-bb-001', 'bb@gabaritai.com.br', 'Beta Tester — Banco do Brasil', 'BASIC', '{"bb-escriturario"}', 'Banco do Brasil', 'zero', '2', 'Entrar no Banco do Brasil.', 'STUDENT'),
  ('beta-tjdft-001', 'tjdft@gabaritai.com.br', 'Beta Tester — TJDFT', 'PREMIUM', '{"tjdft-tecnico","tjdft-analista"}', 'TJDFT — Técnico', 'intermediario', '5', 'Ser aprovado no TJDFT.', 'STUDENT'),
  ('beta-cbmdf-001', 'bombeiro@gabaritai.com.br', 'Beta Tester — CBMDF', 'PREMIUM', '{"cbmdf-soldado","cbmdf-oficial"}', 'CBMDF — Soldado', 'basico', '3', 'Vestir a farda do CBMDF.', 'STUDENT'),
  ('beta-cef-001', 'cef@gabaritai.com.br', 'Beta Tester — Caixa', 'BASIC', '{"cef-tecnico"}', 'Caixa Econômica Federal', 'zero', '2', 'Trabalhar na Caixa.', 'STUDENT'),
  ('beta-cnu-001', 'cnu@gabaritai.com.br', 'Beta Tester — CNU', 'PREMIUM', '{"cnu-bloco1","cnu-bloco2","cnu-bloco3"}', 'CNU — Concurso Nacional', 'intermediario', '4', 'Ser aprovado no CNU.', 'STUDENT')
on conflict (id) do nothing;
