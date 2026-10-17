-- Monerpy v0.7.1 — Categoria "Outros" (Entrada e Saída), pré-selecionada em todo lançamento novo.
-- Rode no SQL Editor. Pode ser executado mais de uma vez sem duplicar.

-- Lista padrão de novas contas: acrescenta "Outros" para os dois tipos.
-- Mantenha igual a DEFAULT_CATEGORIES em src/lib/data/seed.ts.
create or replace function public.default_category_seed()
returns table (name text, transaction_type text) language sql immutable as $$
  values
    ('Salário / Pró-Labore', 'INCOME'), ('Freelance / Serviços Prestados', 'INCOME'), ('Dividendos / Proventos', 'INCOME'),
    ('Rendimento de Renda Fixa', 'INCOME'), ('Aluguéis Recebidos', 'INCOME'), ('Venda de Bens', 'INCOME'),
    ('Cashback & Bônus', 'INCOME'), ('Reembolsos & Estornos', 'INCOME'), ('Presentes & Doações Recebidas', 'INCOME'),
    ('Empréstimos Recebidos', 'INCOME'), ('Outros', 'INCOME'),
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
    ('Impostos & Contribuições', 'EXPENSE'), ('Outros', 'EXPENSE')
$$;

-- Contas existentes: cria "Outros" para Entrada e Saída (o índice único por nome+tipo evita duplicar).
insert into public.categories (user_id, name, transaction_type, default_scope)
select u.id, 'Outros', t.transaction_type, 'PERSONAL'
from auth.users u cross join (values ('INCOME'), ('EXPENSE')) as t(transaction_type)
on conflict do nothing;

-- Se alguém já tinha uma "Outros" arquivada, ela volta a ficar ativa.
update public.categories set is_archived = false where name = 'Outros' and is_archived;
