# Changelog

Todas as mudanças relevantes do Monerpy ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa
[Versionamento Semântico](https://semver.org/lang/pt-BR/) (`MAJOR.MINOR.PATCH`). Enquanto a versão
for `0.x`, o app está em desenvolvimento e mudanças de comportamento podem acontecer em versões MINOR.

## [Não lançado]

## [0.6.0] — 2026-10-17

### Adicionado
- **Parcelar no crédito** (Entrada e Saída), visível só com a forma **Crédito**: ao ativar, uma janela oferece
  *Pagamento não recorrente*, *Parcelar ou repetir* e *Fixa mensal*. Fechar sem escolher — inclusive pelo botão/
  gesto "voltar" do celular — cancela e desliga a opção.
- **Parcelar ou repetir**: número de cobranças, valor como total (dividido) ou de cada cobrança e **Periodicidade**
  (diário, semanal, quinzenal, mensal, bimestral, trimestral, semestral, anual ou personalizado em dias).
- **Fixa mensal**: cobrança todo mês a partir da data escolhida; o app cria as próximas automaticamente (até 2 meses
  à frente) e permite **Encerrar cobrança fixa** (cancela as futuras e mantém o histórico).
- Nova lista de **50 categorias** (10 de entrada, 40 de saída), sem divisão profissional/pessoal.
- Ícones 💼 Profissional e 👤 Pessoal no contexto do lançamento.
- **Usuário fantasma** em `/ghost-test-user`: visitante com dados de exemplo em memória; nada é salvo.
- O botão "voltar" do celular fecha janelas (filtros, baixa, categorias, registros…) em vez de sair da página.
- Migration `20261017000000_credit_groups_and_categories.sql`.

### Alterado
- Forma de pagamento fica logo abaixo da Categoria no novo lançamento.
- O teclado não abre mais sozinho ao entrar em "Novo lançamento".
- Categorias padrão antigas sem nenhum lançamento são arquivadas (podem ser reativadas em Categorias).

## [0.5.0] — 2026-10-16

### Adicionado
- E-mail com registro recusado não pode enviar nova solicitação: a tela informa que já houve um pedido e
  orienta procurar o suporte (contato opcional via `SUPPORT_EMAIL`). E-mail já aprovado é orientado a entrar.
- Botão **Aprovar cadastro** na aba Recusados: move o pedido para Aprovados e envia o link de criar senha.
- Manifesto do app (`/manifest.webmanifest`): atalho na tela inicial sempre abre o Início.

### Corrigido
- Campos de texto dentro de janelas (ex.: motivo da recusa, nova categoria, filtros) perdiam o foco a
  cada caractere digitado.
- A introdução (saldo inicial) podia reaparecer ao abrir o app em outro aparelho; agora `/onboarding`
  leva ao Início quando a conta já fez a configuração, e o login não retorna mais para ela.

## [0.4.1] — 2026-10-16

### Corrigido
- Área de Registros mostrava "Sessão expirada" e o pedido de registro falhava sem explicação quando a
  `SUPABASE_SERVICE_ROLE_KEY` estava errada. O servidor agora detecta chave pública no lugar da secreta,
  chave de outro projeto, chave cortada ou recusada pelo Supabase, e explica a correção na tela de
  Registros (o público vê só uma mensagem genérica). Detalhes vão para os logs da Vercel.
- Tabela de pedidos inexistente (migration não executada) é identificada também pelo código `PGRST205`.

## [0.4.0] — 2026-10-16

### Adicionado
- **Solicitação de registro com aprovação**: aba "Registrar" ao lado de "Entrar"; a pessoa informa o
  e-mail e vê a confirmação de envio. Administradores aprovam ou recusam em **Registros**.
  Aprovado: e-mail com link para criar a senha (`/definir-senha`, funciona em qualquer navegador).
  Recusado: e-mail de recusa com motivo opcional. Aviso opcional ao administrador a cada novo pedido.
- Migration `20261016000000_registration_requests.sql`: tabela de pedidos, `profiles.is_admin`, RLS e
  privilégios por coluna (a usuária não pode se tornar administradora).
- Rotas do servidor (`/api/registro`, `/api/admin/registros`) e envio de e-mail por SMTP (`nodemailer`).
- Guia de SMTP no README para tirar o limite de 2 e-mails/hora do Supabase.

### Corrigido
- `next.config.ts` lia o `package.json` por caminho relativo e falhava fora da pasta do projeto.

## [0.3.0] — 2026-10-15

### Adicionado
- Seletor Entrada/Saída colorido no novo lançamento: vermelho para saída, verde para entrada, pílula
  com borda branca que desliza entre as opções; valor e botão de confirmar acompanham a cor.
- Documentação de arquitetura (`docs/ARQUITETURA.md`), guia de contribuição (`CONTRIBUTING.md`) e este changelog.
- Script `npm run check` (tipos + lint + testes).

### Corrigido
- Página aparecia só com o HTML (sem estilo) no celular quando o navegador abria uma versão antiga
  do app; agora a página se recarrega uma vez e busca a versão atual.
- Tela de nova senha valida o link antes de exibir o formulário e explica quando ele expirou ou foi
  aberto em outro navegador.

### Alterado
- Código reorganizado em pastas por responsabilidade (`components/ui`, `components/layout`,
  `components/transactions`, `components/charts`, `providers`, `hooks`, `lib/domain`, `lib/data`).
  Nenhuma mudança de comportamento.

## [0.2.0] — 2026-10-15

### Adicionado
- Interface para computador: barra lateral a partir de 1024 px, telas em grade e modais centralizados.
- Diagnóstico das variáveis do Supabase na tela de login.
- Criação automática de perfil e categorias no primeiro login, se ausentes.

### Corrigido
- Build quebrava com `NEXT_PUBLIC_SUPABASE_URL` mal formatada; formatos comuns agora são corrigidos.
- Login não mostrava erros de carregamento dos dados.
- Chave secreta do Supabase é recusada no navegador.

## [0.1.0] — 2026-10-15

### Adicionado
- MVP mobile: login e recuperação de senha, saldo inicial, dashboard, movimentações com busca e
  filtros, lançamento com parcelamento no cartão, pendências, lembretes, relatórios, categorias,
  exportação CSV e configurações.
- Regras financeiras do PRD com testes; camada de dados local e Supabase (RLS).

[Não lançado]: https://github.com/fe-lops/Monerpy/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/fe-lops/Monerpy/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/fe-lops/Monerpy/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/fe-lops/Monerpy/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/fe-lops/Monerpy/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/fe-lops/Monerpy/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/fe-lops/Monerpy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fe-lops/Monerpy/releases/tag/v0.1.0
