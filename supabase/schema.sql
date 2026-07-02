-- "A Tua Rota" — esquema da base de dados (Supabase)
-- Executa em: Dashboard -> SQL Editor -> New query -> colar -> Run
-- (Já aplicado no projeto CoreQuest via migração create_rota_responses.)

create table if not exists public.rota_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  profile text not null,          -- PIONEIRO | CURIOSO | GUARDIAO | OBSERVADOR
  ab int not null,                -- pontos Abertura (máx 17)
  ac int not null,                -- pontos Ação (máx 13)
  ab_n numeric not null,          -- ab / 17
  ac_n numeric not null,          -- ac / 13
  answers jsonb not null          -- [opção 1..4 por pergunta], 10 elementos
);

-- RLS ativo, sem políticas públicas: só o servidor (service_role) acede.
alter table public.rota_responses enable row level security;

create index if not exists rota_responses_created_at_idx
  on public.rota_responses (created_at desc);
create index if not exists rota_responses_profile_idx
  on public.rota_responses (profile);
