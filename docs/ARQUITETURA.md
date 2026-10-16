# Arquitetura do Monerpy

Guia rápido para quem vai ler ou alterar o código. Requisitos de produto: `../Planejamento/dataset/PRD_WebApp_Gestao_Financeira_v1_1.md`.

## Visão geral

App Next.js (App Router) que roda inteiro no navegador da usuária. Os dados vêm de um **repositório**
trocável: Supabase (produção) ou `localStorage` (desenvolvimento/demonstração, quando não há `.env.local`).
A segurança dos dados é garantida pelo **RLS do PostgreSQL**, não pelo frontend.

```
 Página (src/app)  ──usa──▶  Componentes (src/components)
        │                          │
        └──────▶  useData() / useReady()  (src/providers/DataProvider)
                         │
                         ├──▶ Regras puras   (src/lib/domain)   saldo, pendências, parcelas, CSV…
                         └──▶ Repositório    (src/lib/data)     LocalRepo | SupabaseRepo
                                                   │
                                                   └──▶ Supabase (Auth + PostgreSQL + RLS)
```

## Camadas e pastas

| Pasta | Responsabilidade | Pode importar de |
|---|---|---|
| `src/app/` | Rotas. `(app)/` é a área autenticada; `login`, `recuperar-senha` e `redefinir-senha` são públicas. Páginas montam a tela e chamam ações do provider. | tudo abaixo |
| `src/components/ui/` | Peças visuais genéricas do Design System (`Screen`, `Seg`, `Field`, `Sheet`…). **Sem regra de negócio.** | `lib/domain` (só formatação) |
| `src/components/layout/` | Moldura do app: `Sidebar` (computador), `BottomNav` (celular), `AuthCard`. | `ui`, `providers`, `hooks` |
| `src/components/transactions/` | Tudo de lançamentos: formulário, linhas, baixa (`useSettleFlow`), pendências, seletor Entrada/Saída. | `ui`, `providers`, `lib/domain` |
| `src/components/charts/` | Gráficos em CSS puro. | `lib/domain` |
| `src/providers/` | Estado global: `DataProvider` (sessão, dados, ações) e `ToastProvider` (avisos). | `lib` |
| `src/hooks/` | Hooks reutilizáveis entre telas (`useReminders`, `useMonthPeriod`). | `providers`, `lib/domain` |
| `src/lib/domain/` | **Regras de negócio puras**, sem React e sem rede: tipos, dinheiro, datas, finanças, validação (Zod). Tudo testável. | apenas entre si |
| `src/lib/domain/recurrence.ts` | Crédito: periodicidade, parcelar/repetir (total ou por cobrança) e fixa mensal (gera até 2 meses à frente; o `DataProvider` completa as que faltam a cada carregamento). | `lib/domain` |
| `src/lib/ghost.ts` | Modo visitante (`/ghost-test-user`): cookie de sessão que faz `getRepo()` usar `LocalRepo` em memória com `demoDB()`. | — |
| `src/lib/data/` | Acesso a dados. `repo.ts` define o contrato; `local.ts` e `supabase.ts` o implementam. | `lib/domain`, `lib/env` |
| `src/lib/server/` | **Somente servidor** (`import "server-only"`): cliente Supabase com a chave `service_role`, envio de e-mail SMTP, modelos de e-mail e `requireAdmin`. Nunca importe em componente do navegador. | `lib/domain`, `lib/env` |
| `src/app/api/` | Rotas do servidor: `POST /api/registro` (pedido público) e `/api/admin/registros` (somente administradores, via `Authorization: Bearer`). | `lib/server`, `lib/domain` |
| `src/lib/env.ts` | Leitura e validação das variáveis `NEXT_PUBLIC_SUPABASE_*`. | — |
| `src/middleware.ts` | Renova a sessão e protege rotas quando o Supabase está configurado. | `lib/env` |
| `supabase/migrations/` | Esquema SQL versionado: tabelas, constraints, RLS, gatilhos e funções. | — |

Fluxo do registro com aprovação: `/registro` → `POST /api/registro` (grava em `registration_requests`)
→ administrador em `/admin/registros` → `POST /api/admin/registros/:id` → aprovar: cria a conta e envia link
`/definir-senha?token_hash=…`; recusar: envia e-mail de recusa.

Regra de ouro: **dependências apontam para baixo** (`app → components → providers → lib`). `lib/domain`
não conhece React nem Supabase.

## Convenções

- **Dinheiro em centavos inteiros** no app (`number`), `NUMERIC(14,2)` no banco. Nunca `float` para somar.
  Conversões só em `lib/data/supabase.ts` (`centsToNumeric` / `numericToCents`).
- **Datas** como texto `YYYY-MM-DD`, calculadas no fuso `America/Sao_Paulo` (`lib/domain/dates.ts`).
- **Nomes**: código e tipos em inglês (`Transaction`, `settle`); textos de interface, comentários e
  rotas em português (`/contas-a-pagar`).
- **Um componente por arquivo**, nome do arquivo = nome do componente. Cada pasta exporta pelo seu
  `index.ts`; dentro da mesma pasta, importe pelo caminho relativo (`./PendingRow`) para evitar ciclos.
- **Estilos**: tokens de cor em `src/app/globals.css` (`:root` e `[data-theme="light"]`); componentes
  usam classes do Design System (`.panel`, `.seg`, `.cta`…) e utilitários Tailwind. Celular primeiro;
  `lg:` (≥ 1024 px) para computador.
- **Layout no celular nunca transborda** (largura mínima 360 px):
  - Grade (`grid`) sempre com colunas definidas também no celular: `grid-cols-1` / `grid-cols-2`
    (o Tailwind gera `minmax(0, 1fr)`). Grade sem colunas cria uma coluna "auto" que cresce até o
    maior texto sem quebra e alarga a página — foi a causa do layout "encolhido" no celular (v0.7.0).
  - Linhas de itens iguais com texto (rótulos de gráfico) usam `equalColumns(n)` de `components/charts/scale.ts`.
  - Rede de segurança em `globals.css`: `overflow-x: clip` em `html/body` e `min-width: 0` nos filhos de `.grid`.
  - Em desenvolvimento, `OverflowGuard` avisa no console (`[layout] …`) qual elemento passou da tela.
- **Idempotência**: lançamentos e parcelamentos recebem `id` gerado no cliente; reenviar não duplica.
- **Segredos só no servidor**: variáveis sem `NEXT_PUBLIC_` (ex.: `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS`)
  são lidas apenas em `lib/server/config.ts`. Administradores são definidos no banco (`profiles.is_admin`),
  e a usuária não consegue alterar essa coluna (privilégios por coluna na migration).
- **Nada é apagado**: lançamentos são cancelados (`status = CANCELLED`), preservando o histórico.

## Onde mexer para…

| Tarefa | Arquivos |
|---|---|
| Nova regra de cálculo | `lib/domain/finance.ts` + teste em `finance.test.ts` |
| Novo campo em lançamento | `lib/domain/types.ts`, `schemas.ts`, `lib/data/*`, nova migration em `supabase/migrations/`, `TransactionForm.tsx` |
| Nova tela | `src/app/(app)/<rota>/page.tsx`; item de menu em `components/layout/Sidebar.tsx` e/ou `BottomNav.tsx` |
| Novo componente visual genérico | `components/ui/<Nome>.tsx` + export em `components/ui/index.ts` |
| Mudar cores/tema | tokens em `src/app/globals.css` |

## Usuário fantasma

`/ghost-test-user` liga o modo visitante: `LocalRepo(memoryStore(demoDB))`, sem tocar no Supabase (o middleware
apenas não redireciona para o login; sem sessão, o RLS bloqueia qualquer dado real). **Toda funcionalidade nova
deve ganhar um exemplo em `buildDemoData` (`lib/data/seed.ts`).**

## Testes

`npm test` roda os testes de `lib/domain` e `lib/env` (Vitest), incluindo os critérios de aceite do PRD
(§11). Ao alterar uma regra financeira, adicione o caso correspondente antes de mudar o código.
