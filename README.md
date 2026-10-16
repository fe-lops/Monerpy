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

## Estrutura

```
src/
  app/                  rotas (App Router). (app)/ = área autenticada
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
