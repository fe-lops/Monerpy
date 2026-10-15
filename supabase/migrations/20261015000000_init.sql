-- Monerpy — esquema inicial (PRD v1.1, §6–§10)
-- Dinheiro em NUMERIC(14,2). Toda tabela tem RLS: cada usuária só vê e altera os próprios dados.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Função utilitária: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  opening_balance numeric(14,2) not null default 0,
  opening_balance_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  timezone text not null default 'America/Sao_Paulo',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  transaction_type text not null check (transaction_type in ('INCOME', 'EXPENSE')),
  default_scope text not null check (default_scope in ('BUSINESS', 'PERSONAL')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
-- Evita categorias duplicadas (mesmo nome e tipo) para a mesma usuária.
create unique index categories_unique_name on public.categories (user_id, transaction_type, lower(trim(name)));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- installment_groups (compra parcelada no cartão)
-- ---------------------------------------------------------------------------
create table public.installment_groups (
  id uuid primary key,                       -- gerado no cliente: torna a criação idempotente
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null default '',
  total_amount numeric(14,2) not null check (total_amount > 0),
  installment_count int not null check (installment_count >= 2 and installment_count <= 48),
  payment_method text not null default 'CREDIT_CARD' check (payment_method = 'CREDIT_CARD'),
  first_due_date date not null,
  scope text not null check (scope in ('BUSINESS', 'PERSONAL')),
  category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);
create trigger installment_groups_updated_at before update on public.installment_groups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  installment_group_id uuid,
  type text not null check (type in ('INCOME', 'EXPENSE')),
  scope text not null check (scope in ('BUSINESS', 'PERSONAL')),
  status text not null default 'PENDING' check (status in ('PENDING', 'SETTLED', 'CANCELLED')),
  description text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  due_date date,
  expected_date date,
  settled_at timestamptz,
  payment_method text not null default 'UNSPECIFIED'
    check (payment_method in ('PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'UNSPECIFIED')),
  installment_number int,
  installment_count int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- A categoria e o grupo precisam ser da mesma usuária.
  foreign key (category_id, user_id) references public.categories (id, user_id),
  foreign key (installment_group_id, user_id) references public.installment_groups (id, user_id) on delete cascade,
  constraint installment_range check (
    (installment_number is null and installment_count is null)
    or (installment_count >= 2 and installment_number between 1 and installment_count)
  ),
  constraint settled_has_date check (status <> 'SETTLED' or settled_at is not null),
  constraint cancelled_has_date check (status <> 'CANCELLED' or cancelled_at is not null),
  -- Uma parcela pertence a um único grupo e não se repete.
  unique (installment_group_id, installment_number)
);
create index transactions_user_date on public.transactions (user_id, transaction_date);
create index transactions_user_status_due on public.transactions (user_id, status, due_date);
create index transactions_user_category on public.transactions (user_id, category_id);
create index transactions_user_scope on public.transactions (user_id, scope);
create index transactions_user_method on public.transactions (user_id, payment_method);
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- Categorias arquivadas não podem ser usadas em novos lançamentos (continuam no histórico).
create or replace function public.check_category_not_archived()
returns trigger language plpgsql as $$
begin
  if new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and exists (select 1 from public.categories c where c.id = new.category_id and c.is_archived) then
    raise exception 'Categoria arquivada não pode ser usada em novos lançamentos.';
  end if;
  return new;
end $$;
create trigger transactions_category_active before insert or update of category_id on public.transactions
  for each row execute function public.check_category_not_archived();

-- ---------------------------------------------------------------------------
-- reminders (lembretes internos)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete cascade,
  remind_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SEEN', 'DONE', 'CANCELLED')),
  channel text not null default 'IN_APP' check (channel = 'IN_APP'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, transaction_id)
);
create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.installment_groups enable row level security;
alter table public.transactions enable row level security;
alter table public.reminders enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own categories" on public.categories
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own installment groups" on public.installment_groups
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own transactions" on public.transactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reminders" on public.reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lançamentos não são apagados pelo app (regra 21: cancelar preserva histórico).
revoke delete on public.transactions from authenticated, anon;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Novo usuário: cria perfil e categorias iniciais
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.categories (user_id, name, transaction_type, default_scope) values
    (new.id, 'Receita de atendimento', 'INCOME', 'BUSINESS'),
    (new.id, 'Produtos', 'EXPENSE', 'BUSINESS'),
    (new.id, 'Gasolina/Deslocamento', 'EXPENSE', 'BUSINESS'),
    (new.id, 'Outras despesas profissionais', 'EXPENSE', 'BUSINESS'),
    (new.id, 'Outras receitas', 'INCOME', 'PERSONAL'),
    (new.id, 'Água', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Luz', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Internet', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Gás', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Seguro do carro', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Cartão de crédito', 'EXPENSE', 'PERSONAL'),
    (new.id, 'Outras despesas pessoais', 'EXPENSE', 'PERSONAL')
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Compra parcelada: cria grupo + N parcelas numa única transação.
-- Idempotente: chamar de novo com o mesmo p_group_id não duplica nada (regra 23).
-- Centavos excedentes vão para a última parcela (regra 14).
-- ---------------------------------------------------------------------------
create or replace function public.create_installment_purchase(
  p_group_id uuid,
  p_description text,
  p_total_amount numeric,
  p_installment_count int,
  p_first_due_date date,
  p_scope text,
  p_category_id uuid,
  p_transaction_date date
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_inserted int;
  v_base numeric(14,2);
  v_amount numeric(14,2);
  i int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if p_installment_count < 2 then
    raise exception 'Mínimo de 2 parcelas';
  end if;

  insert into public.installment_groups (id, description, total_amount, installment_count, first_due_date, scope, category_id)
  values (p_group_id, coalesce(p_description, ''), p_total_amount, p_installment_count, p_first_due_date, p_scope, p_category_id)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return p_group_id; -- já criado antes (reenvio)
  end if;

  v_base := floor(p_total_amount * 100 / p_installment_count) / 100;
  for i in 1..p_installment_count loop
    v_amount := case when i = p_installment_count then p_total_amount - v_base * (p_installment_count - 1) else v_base end;
    insert into public.transactions (
      category_id, installment_group_id, type, scope, status, description, amount,
      transaction_date, due_date, payment_method, installment_number, installment_count
    ) values (
      p_category_id, p_group_id, 'EXPENSE', p_scope, 'PENDING',
      coalesce(p_description, '') || ' (' || i || '/' || p_installment_count || ')', v_amount,
      p_transaction_date, (p_first_due_date + make_interval(months => i - 1))::date,
      'CREDIT_CARD', i, p_installment_count
    );
  end loop;
  return p_group_id;
end $$;

grant execute on function public.create_installment_purchase(uuid, text, numeric, int, date, text, uuid, date) to authenticated;
