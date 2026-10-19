# Monerpy

WebApp mobile-first de controle de caixa pessoal e profissional para microempreendedores.
Especificação completa em `../Planejamento/dataset/PRD_WebApp_Gestao_Financeira_v1_1.md`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth + PostgreSQL + RLS) · Zod · React Hook Form · Lucide · Vitest.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # regras financeiras (critérios de aceite do PRD)
npm run check    # tipos + lint + testes (rode antes de cada commit)
npm run build
```

Sem `.env.local` o app roda em **modo local**: os dados ficam no `localStorage` do navegador.
Serve para desenvolver e demonstrar (há a opção "Explorar com dados de exemplo").

## Conectando o Supabase

1. No [painel do Supabase](https://supabase.com/dashboard), crie um projeto (região São Paulo, `sa-east-1`).
2. **Banco:** abra *SQL Editor*, cole o conteúdo de `supabase/migrations/20261015000000_init.sql` e execute.
   Isso cria as tabelas, as políticas RLS, as categorias iniciais automáticas e a função de parcelamento.
3. **Usuária:** em *Authentication → Users → Add user*, crie o usuário da cliente (e-mail + senha, marque *Auto Confirm*).
   O app é de uso individual, então desative cadastros públicos em *Authentication → Sign In / Providers → Allow new users to sign up*.
4. **URLs:** em *Authentication → URL Configuration*, defina *Site URL* (ex.: `http://localhost:3000` em desenvolvimento,
   a URL da Vercel em produção) e adicione `<site>/redefinir-senha` em *Redirect URLs* (link de recuperação de senha).
5. **Chaves:** copie `.env.example` para `.env.local` e preencha com *Project URL* e a chave **anon/publishable**
   (*Project Settings → API*). Nunca use a chave `service_role` no frontend.
6. Reinicie `npm run dev`. A tela de login passa a pedir e-mail e senha.

## Migrations do banco

Rode cada arquivo de `supabase/migrations/`, em ordem, no **SQL Editor** do Supabase (uma vez cada):

| Arquivo | Versão | O que faz |
|---|---|---|
| `20261015000000_init.sql` | 0.1 | Tabelas, RLS, categorias iniciais, parcelamento |
| `20261016000000_registration_requests.sql` | 0.4 | Pedidos de registro e administradores |
| `20261017000000_credit_groups_and_categories.sql` | 0.6 | Crédito: parcelar/repetir com periodicidade e fixa mensal; nova lista de categorias |
| `20261018000000_outros_category.sql` | 0.7.1 | Categoria "Outros" (Entrada e Saída) para todas as contas |

## Marca

Logo e ícones são gerados a partir dos SVGs em `design/brand/` com `python scripts/brand/gerar_marca.py`
(requer Pillow e Microsoft Edge). Detalhes em `docs/ARQUITETURA.md` → Marca.

## Usuário fantasma (demonstração)

`https://SUA-URL/ghost-test-user` abre o app como **visitante**, com dados de exemplo que mostram todas as
funcionalidades. Tudo roda na memória do navegador: nada vai para o Supabase e atualizar a página restaura o
exemplo. O link não aparece em buscadores. Para sair, toque em **Sair** na faixa do topo.
Ao criar uma funcionalidade nova, inclua um exemplo dela em `buildDemoData` (`src/lib/data/seed.ts`).

## Configurar SMTP (e-mails sem limite de 2 por hora)

O e-mail padrão do Supabase envia **no máximo 2 e-mails de autenticação por hora para o projeto inteiro**
(recuperação de senha, convites), sem opção de aumentar. Com um SMTP próprio esse limite passa a ser
configurável e o intervalo mínimo por usuário cai para cerca de 60 segundos. O mesmo SMTP é usado pelo app
nos e-mails de aprovação/recusa de registro.

**Exemplo com Gmail** (até ~500 e-mails/dia):
1. Ative a verificação em duas etapas na conta Google e crie uma **senha de app** em
   <https://myaccount.google.com/apppasswords> (16 caracteres).
2. **Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:**
   host `smtp.gmail.com`, porta `465`, usuário = seu Gmail, senha = senha de app,
   remetente = seu Gmail, nome = `Monerpy`.
3. **Supabase → Authentication → Rate Limits:** aumente *Rate limit for sending emails* (ex.: 30 por hora).
4. **Vercel → Environment Variables:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Sensitive) e
   `SMTP_FROM` com os mesmos dados; depois, Redeploy.

Outras opções: Brevo (`smtp-relay.brevo.com`, porta `587`, 300 e-mails/dia grátis) ou Resend (exige domínio próprio).

## Registro com aprovação do administrador

Novas usuárias tocam em **Registrar**, informam o e-mail e o pedido fica pendente. Um administrador aprova ou
recusa em **Registros** (barra lateral / Mais). Aprovado: a pessoa recebe um link para criar a senha
(funciona em qualquer navegador). Recusado: recebe um e-mail de recusa, com motivo opcional.

1. Rode `supabase/migrations/20261016000000_registration_requests.sql` no **SQL Editor**.
2. Torne sua conta administradora (troque o e-mail) e rode no SQL Editor:
   ```sql
   update public.profiles set is_admin = true
   where user_id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```
3. **Vercel → Environment Variables:** `SUPABASE_SERVICE_ROLE_KEY` (Supabase → API Keys → *service_role / secret*),
   marcada como **Sensitive** e **sem** prefixo `NEXT_PUBLIC_`. Opcional: `ADMIN_EMAIL` (aviso de novos pedidos)
   e `APP_URL` (URL pública para os links).
4. Configure o SMTP (seção acima) e faça **Redeploy**.
5. Em **Authentication → URL Configuration → Redirect URLs**, adicione `https://SUA-URL/definir-senha`.

Regras: um e-mail **recusado não pode pedir acesso de novo** (a tela orienta a procurar o suporte; defina
`SUPPORT_EMAIL` para exibir o contato) e um e-mail já aprovado é orientado a entrar. Em **Recusados**, o
botão **Aprovar cadastro** move o pedido para Aprovados e envia o link de criação de senha.

Sem SMTP, a aprovação usa o convite padrão do Supabase (sujeito ao limite de 2/hora) e a recusa não envia e-mail.

## Estrutura

```
src/
  app/                  rotas (App Router). (app)/ = área autenticada; api/ = rotas do servidor
  components/
    ui/                 peças visuais genéricas do Design System
    layout/             Sidebar (computador), BottomNav (celular), AuthCard
    transactions/       lançamentos: formulário, linhas, baixa, pendências
    charts/             gráficos em CSS
  providers/            estado global: dados (DataProvider) e avisos (ToastProvider)
  hooks/                hooks reutilizáveis
  lib/
    domain/             regras de negócio puras + testes (saldo, parcelas, CSV…)
    data/               acesso a dados: LocalRepo (navegador) e SupabaseRepo
    server/             SÓ servidor: cliente admin (service_role), e-mails SMTP, guarda de admin
    env.ts              leitura/validação das variáveis do Supabase
  middleware.ts         protege rotas quando o Supabase está configurado
supabase/migrations/    esquema SQL versionado com RLS
docs/ARQUITETURA.md     camadas, convenções e "onde mexer para…"
```

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md). Para contribuir (branches, commits, versões),
veja [`CONTRIBUTING.md`](CONTRIBUTING.md). Histórico de versões em [`CHANGELOG.md`](CHANGELOG.md).

## Decisões

- Dinheiro é manipulado em **centavos inteiros** no app e `NUMERIC(14,2)` no banco — nunca `float`.
- O **saldo total** é único (não há contas/carteiras). O filtro Profissional/Pessoal afeta indicadores, pendências e listas.
- Lançamentos são **cancelados**, não apagados (o banco revoga `DELETE` em `transactions`).
- Parcelamento e criação de lançamentos são **idempotentes** (id gerado no cliente): clique duplo não duplica.
- Lembretes são internos ao app; e-mail/WhatsApp/push aguardam confirmação da cliente (PRD §13).
