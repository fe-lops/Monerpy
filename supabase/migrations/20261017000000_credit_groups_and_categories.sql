-- Monerpy v0.6.0 — Crédito: parcelar/repetir com periodicidade e cobrança fixa mensal; nova lista de categorias.
-- Rode inteiro no SQL Editor. Pode ser executado mais de uma vez sem duplicar dados.

-- ---------------------------------------------------------------------------
-- 1. Grupos de cobrança no crédito
-- ---------------------------------------------------------------------------
alter table public.installment_groups
  add column if not exists kind text not null default 'INSTALLMENT',
  add column if not exists type text not null default 'EXPENSE',
  add column if not exists periodicity text not null default 'MONTHLY',
  add column if not exists interval_days int,
  add column if not exists active boolean not null default true,
  add column if not exists ended_at timestamptz;

alter table public.installment_groups alter column installment_count drop not null;

alter table public.installment_groups drop constraint if exists installment_groups_installment_count_check;
alter table public.installment_groups drop constraint if exists installment_groups_kind_check;
alter table public.installment_groups drop constraint if exists installment_groups_type_check;
alter table public.installment_groups drop constraint if exists installment_groups_periodicity_check;
alter table public.installment_groups drop constraint if exists installment_groups_count_by_kind;
alter table public.installment_groups drop constraint if exists installment_groups_custom_interval;

alter table public.installment_groups
  add constraint installment_groups_kind_check check (kind in ('INSTALLMENT', 'FIXED')),
  add constraint installment_groups_type_check check (type in ('INCOME', 'EXPENSE')),
  add constraint installment_groups_periodicity_check
    check (periodicity in ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM')),
  -- Parcelado: 2 a 360 cobranças. Fixa mensal: sem número total.
  add constraint installment_groups_count_by_kind
    check ((kind = 'INSTALLMENT' and installment_count between 2 and 360) or (kind = 'FIXED' and installment_count is null)),
  -- Personalizado exige o intervalo em dias (1 a 3650); as demais periodicidades não usam.
  add constraint installment_groups_custom_interval
    check ((periodicity = 'CUSTOM' and interval_days between 1 and 3650) or (periodicity <> 'CUSTOM' and interval_days is null));

-- Cobranças de grupo: número >= 1; total opcional (fixa mensal não tem total).
alter table public.transactions drop constraint if exists installment_range;
alter table public.transactions add constraint installment_range check (
  (installment_group_id is null and installment_number is null and installment_count is null)
  or (installment_group_id is not null and installment_number >= 1
      and (installment_count is null or (installment_count >= 2 and installment_number <= installment_count)))
);

-- ---------------------------------------------------------------------------
-- 2. Criação atômica e idempotente de um grupo + cobranças (geradas pelo app em lib/domain/recurrence.ts)
--    Mesmo p_group.id de novo (clique duplo / rede) não duplica nada.
-- ---------------------------------------------------------------------------
create or replace function public.create_transaction_group(p_group jsonb, p_transactions jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := (p_group->>'id')::uuid;
  v_inserted int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.installment_groups (
    id, kind, type, description, total_amount, installment_count, periodicity, interval_days,
    payment_method, first_due_date, scope, category_id
  ) values (
    v_id, p_group->>'kind', p_group->>'type', coalesce(p_group->>'description', ''),
    (p_group->>'total_amount')::numeric, (p_group->>'installment_count')::int,
    p_group->>'periodicity', (p_group->>'interval_days')::int,
    'CREDIT_CARD', (p_group->>'first_due_date')::date, p_group->>'scope', nullif(p_group->>'category_id', '')::uuid
  )
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return v_id; -- já criado antes
  end if;

  insert into public.transactions (
    id, category_id, installment_group_id, type, scope, status, description, amount,
    transaction_date, due_date, expected_date, payment_method, installment_number, installment_count
  )
  select x.id, x.category_id, v_id, x.type, x.scope, 'PENDING', x.description, x.amount,
         x.transaction_date, x.due_date, x.expected_date, 'CREDIT_CARD', x.installment_number, x.installment_count
  from jsonb_to_recordset(p_transactions) as x(
    id uuid, category_id uuid, type text, scope text, description text, amount numeric,
    transaction_date date, due_date date, expected_date date, installment_number int, installment_count int
  );
  return v_id;
end $$;

grant execute on function public.create_transaction_group(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Categorias: lista única (sem divisão profissional/pessoal), separada só por Entrada/Saída.
--    Fonte única usada pelo gatilho de novas contas e pela atualização das contas existentes.
--    Mantenha igual a DEFAULT_CATEGORIES em src/lib/data/seed.ts.
-- ---------------------------------------------------------------------------
create or replace function public.default_category_seed()
returns table (name text, transaction_type text) language sql immutable as $$
  values
    ('Salário / Pró-Labore', 'INCOME'), ('Freelance / Serviços Prestados', 'INCOME'), ('Dividendos / Proventos', 'INCOME'),
    ('Rendimento de Renda Fixa', 'INCOME'), ('Aluguéis Recebidos', 'INCOME'), ('Venda de Bens', 'INCOME'),
    ('Cashback & Bônus', 'INCOME'), ('Reembolsos & Estornos', 'INCOME'), ('Presentes & Doações Recebidas', 'INCOME'),
    ('Empréstimos Recebidos', 'INCOME'),
    ('Aluguel & Condomínio', 'EXPENSE'), ('Financiamento Imobiliário', 'EXPENSE'), ('Contas de Consumo', 'EXPENSE'),
    ('Internet & Telefonia', 'EXPENSE'), ('Manutenção & Reformas', 'EXPENSE'), ('Móveis & Eletrodomésticos', 'EXPENSE'),
    ('Limpeza & Organização', 'EXPENSE'), ('IPTU & Taxas Municipais', 'EXPENSE'), ('Serviços Domésticos', 'EXPENSE'),
    ('Seguro Residencial', 'EXPENSE'), ('Supermercado & Feira', 'EXPENSE'), ('Restaurantes & Bares', 'EXPENSE'),
    ('Delivery & Apps de Comida', 'EXPENSE'), ('Cafeterias & Lanches', 'EXPENSE'), ('Padaria & Conveniência', 'EXPENSE'),
    ('Combustível', 'EXPENSE'), ('Transporte Público', 'EXPENSE'), ('Transporte por App & Táxi', 'EXPENSE'),
    ('Manutenção do Veículo', 'EXPENSE'), ('IPVA, Licenciamento & Seguros', 'EXPENSE'), ('Estacionamento & Pedágios', 'EXPENSE'),
    ('Plano de Saúde & Odontológico', 'EXPENSE'), ('Farmácia & Medicamentos', 'EXPENSE'), ('Consultas & Exames', 'EXPENSE'),
    ('Academia & Esportes', 'EXPENSE'), ('Cuidados Pessoais & Estética', 'EXPENSE'), ('Assinaturas & Streaming', 'EXPENSE'),
    ('Jogos & Software', 'EXPENSE'), ('Cinema, Shows & Eventos', 'EXPENSE'), ('Viagens & Hospedagem', 'EXPENSE'),
    ('Roupas & Acessórios', 'EXPENSE'), ('Cursos & Certificações', 'EXPENSE'), ('Livros & Material Didático', 'EXPENSE'),
    ('Pets', 'EXPENSE'), ('Presentes & Doações', 'EXPENSE'), ('Aportes em Investimentos', 'EXPENSE'),
    ('Reserva de Emergência', 'EXPENSE'), ('Tarifas Bancárias & Anuidade', 'EXPENSE'), ('Pagamento de Dívidas & Juros', 'EXPENSE'),
    ('Impostos & Contribuições', 'EXPENSE')
$$;

-- Novas contas: perfil + lista nova.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.categories (user_id, name, transaction_type, default_scope)
  select new.id, s.name, s.transaction_type, 'PERSONAL' from public.default_category_seed() s
  on conflict do nothing;
  return new;
end $$;

-- Contas existentes: adiciona as novas categorias (as que já existem com o mesmo nome são mantidas).
insert into public.categories (user_id, name, transaction_type, default_scope)
select u.id, s.name, s.transaction_type, 'PERSONAL'
from auth.users u cross join public.default_category_seed() s
on conflict do nothing;

-- Arquiva as categorias padrão ANTIGAS que nunca foram usadas (podem ser reativadas em Categorias).
-- As que têm lançamentos continuam ativas, para não esconder o histórico.
update public.categories c
set is_archived = true
where c.name in ('Receita de atendimento', 'Produtos', 'Gasolina/Deslocamento', 'Outras despesas profissionais',
                 'Outras receitas', 'Água', 'Luz', 'Internet', 'Gás', 'Seguro do carro', 'Cartão de crédito',
                 'Outras despesas pessoais')
  and not c.is_archived
  and not exists (select 1 from public.transactions t where t.category_id = c.id)
  and not exists (select 1 from public.installment_groups g where g.category_id = c.id);
