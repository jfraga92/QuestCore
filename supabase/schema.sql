-- Executa este script no Supabase:
-- Dashboard  ->  SQL Editor  ->  New query  ->  colar  ->  Run

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers jsonb not null
);

-- Ativa Row Level Security. Como não criamos políticas públicas,
-- o acesso anónimo fica bloqueado. O servidor usa a service_role key,
-- que ignora o RLS, por isso continua a conseguir gravar e ler.
alter table public.responses enable row level security;

-- Índice para ordenar por data rapidamente.
create index if not exists responses_created_at_idx
  on public.responses (created_at desc);
