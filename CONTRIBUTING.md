# Como contribuir

## Preparação

```bash
npm install
npm run dev      # http://localhost:3000 (modo local se não houver .env.local)
```

Antes de qualquer alteração, leia [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Fluxo de trabalho

1. Crie uma branch a partir de `main` com prefixo do tipo de mudança:
   `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…` (ex.: `feat/fatura-do-cartao`).
2. Faça commits pequenos, um assunto por commit.
3. Rode `npm run check` (tipos + lint + testes) e `npm run build` antes de abrir o PR.
4. Abra um Pull Request para `main`. A Vercel gera uma URL de prévia para testar.
5. Depois do merge, a Vercel publica `main` em produção automaticamente.

## Mensagens de commit — Conventional Commits

```
<tipo>(<escopo opcional>): <resumo no imperativo, em português>

<corpo opcional: o que mudou e por quê>
```

| Tipo | Quando usar | Efeito na versão |
|---|---|---|
| `feat` | nova funcionalidade para a usuária | MINOR |
| `fix` | correção de bug | PATCH |
| `refactor` | reorganização sem mudar comportamento | — |
| `docs` | documentação | — |
| `test` | testes | — |
| `chore` | build, dependências, configuração | — |
| `feat!` / `BREAKING CHANGE:` | quebra compatibilidade (ex.: migration destrutiva) | MAJOR |

Escopos usados: `auth`, `lancamento`, `dashboard`, `pendencias`, `relatorios`, `categorias`, `layout`, `db`.

## Versionamento e releases

O projeto segue [SemVer](https://semver.org/lang/pt-BR/). Para lançar uma versão:

1. Mova as entradas de **[Não lançado]** do `CHANGELOG.md` para uma nova seção `[X.Y.Z] — data`.
2. Atualize `version` no `package.json`.
3. Commit: `chore(release): vX.Y.Z`.
4. Crie a tag anotada e envie:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --follow-tags
   ```

## Banco de dados

- Nunca altere uma migration que já foi aplicada em produção. Crie um arquivo novo em
  `supabase/migrations/` com prefixo de data/hora (`AAAAMMDDHHMMSS_descricao.sql`).
- Toda tabela nova precisa de RLS e política `user_id = auth.uid()`.
- Registre a mudança no `CHANGELOG.md`.

## Checklist do PR

- [ ] `npm run check` e `npm run build` passam
- [ ] Testado no celular (375 px) e no computador (≥ 1024 px), tema escuro e claro
- [ ] Regras financeiras novas têm teste
- [ ] `CHANGELOG.md` atualizado em **[Não lançado]**
