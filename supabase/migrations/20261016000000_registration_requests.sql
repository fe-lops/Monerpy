-- Monerpy — Solicitação de registro com aprovação do administrador (v0.4.0)
--
-- Fluxo: visitante pede acesso informando o e-mail → administrador aprova ou recusa no app
-- → aprovado recebe link para criar a senha; recusado recebe e-mail de recusa.
-- Inserções e aprovações são feitas pelo SERVIDOR (rotas /api com a chave service_role).

-- ---------------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- A usuária continua editando o próprio perfil, mas NUNCA a coluna is_admin.
-- (Privilégios por coluna: o RLS filtra linhas; isto restringe colunas.)
revoke insert, update on public.profiles from authenticated;
grant insert (user_id, display_name, opening_balance, opening_balance_date, timezone, onboarded) on public.profiles to authenticated;
grant update (display_name, opening_balance, opening_balance_date, timezone, onboarded) on public.profiles to authenticated;

-- Usado nas políticas abaixo. security definer: lê profiles sem depender do RLS da chamada.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- registration_requests
-- ---------------------------------------------------------------------------
create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  note text check (note is null or length(note) <= 500), -- motivo da recusa (opcional)
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  constraint decided_consistency check ((status = 'PENDING') = (decided_at is null))
);
-- No máximo uma solicitação pendente por e-mail (reenvios não duplicam).
create unique index registration_requests_one_pending on public.registration_requests (lower(email)) where status = 'PENDING';
create index registration_requests_status_created on public.registration_requests (status, created_at desc);

alter table public.registration_requests enable row level security;

-- Somente administradores leem e decidem. Visitantes não têm acesso direto:
-- a criação passa pela rota /api/registro no servidor.
create policy "admins read requests" on public.registration_requests
  for select to authenticated using (public.is_admin());
create policy "admins decide requests" on public.registration_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.registration_requests from anon;
revoke insert, delete on public.registration_requests from authenticated;

-- ---------------------------------------------------------------------------
-- Para tornar uma conta administradora (rode no SQL Editor, trocando o e-mail):
--
--   update public.profiles set is_admin = true
--   where user_id = (select id from auth.users where email = 'seu-email@exemplo.com');
-- ---------------------------------------------------------------------------
