# Servidor MCP do Gabaritai

Ferramentas para o **admin** analisar o conteúdo da plataforma conversando com o
Claude (Desktop ou Code). Exemplos de pergunta:

- *"Quais matérias do edital da PF estão sem questão?"*
- *"Em que matéria os alunos da PRF vão pior?"*
- *"Me mostra 5 questões da Cebraspe sobre prescrição."*

| Ferramenta | O que faz |
|---|---|
| `listar_concursos` | concursos ativos, banca, ano do edital, nº de matérias e questões |
| `cobertura_do_edital` | por matéria: peso, questões, materiais, flashcards e tópicos sem nenhuma questão |
| `buscar_questoes` | por matéria, banca ou trecho do enunciado (máx. 20) |
| `desempenho_agregado` | acerto médio da turma por matéria — só agregados, grupos < 3 alunos omitidos |

## Por que é ferramenta de admin, e não pública

O banco de questões é o produto. Um MCP aberto entregaria de graça o que o site
vende. Este roda **na sua máquina**, por stdio, e nunca deve ser exposto na rede.

## Segurança em camadas

1. **As ferramentas só leem.** Nenhuma escreve no banco.
2. **Nenhuma devolve dado pessoal.** O desempenho sai agregado, e grupo com menos
   de 3 alunos é omitido — a "média" de um aluno só é o dado dele.
3. **O usuário do banco só lê, e só o necessário.** Use o papel de
   [`papel-somente-leitura.sql`](papel-somente-leitura.sql): `SELECT` em 10
   tabelas, sem acesso a `users` nem `payments`. Mesmo um bug numa ferramenta
   esbarraria no Postgres.

## Configurar no Claude Desktop

Em **Claude Desktop → Settings → Developer → Edit Config**, acrescente:

```json
{
  "mcpServers": {
    "gabaritai": {
      "command": "/usr/local/bin/node",
      "args": [
        "--experimental-transform-types", "--no-warnings",
        "--import", "./scripts/alias/registrar.mjs",
        "./mcp/servidor.ts"
      ],
      "cwd": "/Users/joaolucas/gabaritai/apps/web",
      "env": { "DATABASE_URL": "postgresql://mcp_leitura:SENHA@HOST:5432/postgres" }
    }
  }
}
```

Use o `node` com caminho absoluto: o Claude Desktop roda com um PATH reduzido.
**Não use `npm run mcp`** como comando: o npm imprime um cabeçalho no stdout, que
é o canal do protocolo, e a conexão quebra na primeira linha. (Para testar no
terminal, `npm run --silent mcp`.)

## Configurar no Claude Code

```bash
claude mcp add gabaritai --env DATABASE_URL="postgresql://..." -- \
  node --experimental-transform-types --no-warnings \
  --import /Users/joaolucas/gabaritai/apps/web/scripts/alias/registrar.mjs \
  /Users/joaolucas/gabaritai/apps/web/mcp/servidor.ts
```

## Como foi testado

- **Protocolo** (`src/lib/__tests__/mcp-protocolo.test.ts`): aperto de mão e
  negociação de versão, notificação sem resposta, falha de ferramenta como
  `isError`, códigos de erro do JSON-RPC.
- **Ferramentas** (`tests/integracao/`): contra PostgreSQL real — a lacuna de
  conteúdo é encontrada, e o grupo com 2 alunos é omitido até chegar o terceiro.
- **Transporte**: um cliente de verdade conversando pelo stdio, conferindo que o
  stdout só contém JSON-RPC.
