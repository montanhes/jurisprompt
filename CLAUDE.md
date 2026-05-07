# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
# Subir tudo (build + start)
docker compose up --build

# Só subir (sem rebuild)
docker compose up
```

Não há testes nem linter configurados.

## Variáveis de ambiente obrigatórias

Crie um arquivo `.env` na raiz antes de subir:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...          # string aleatória longa
BASE_URL=http://localhost:3000
```

O `docker-compose.yml` lê essas vars do ambiente/`.env` via `${VAR}`. O `DATABASE_URL` é montado internamente (`postgresql://jurisprompt:secret@postgres:5432/jurisprompt`).

No Google Cloud Console, o URI de redirecionamento autorizado deve ser `{BASE_URL}/auth/google/callback`.

## Arquitetura

4 serviços Docker: `app` (Fastify HTTP), `worker` (BullMQ), `redis`, `grobid`, `postgres`.

**Fluxo de processamento:**
1. `POST /upload` (autenticado) — server salva PDF em `uploads/`, insere job no PostgreSQL, enfileira no BullMQ
2. Worker pega job, lê PDF com `pdf-parse` para contar páginas, envia stream para Grobid `/api/processFulltextDocument`
3. Worker extrai texto do TEI XML retornado, insere marcadores `- page N`, salva TXT em `results/`
4. Worker deleta o PDF original e atualiza job no PostgreSQL
5. `GET /jobs` — lista jobs do usuário autenticado
6. `GET /results/:filename` — download do TXT (verifica ownership via PostgreSQL)

**Fluxo de autenticação:**
1. Frontend chama `GET /auth/me` no load — se 401, exibe overlay de login
2. Usuário clica "Entrar com Google" → `GET /auth/google` (gerado pelo `@fastify/oauth2`)
3. Google redireciona para `GET /auth/google/callback`
4. Server troca code por token, busca userinfo no Google, faz upsert em `users`, assina JWT, seta cookie `token` (httpOnly, SameSite=Lax, 7 dias)
5. Redireciona para `/`

**Módulos:**
- `src/server.js` — Fastify com rotas upload/jobs/results + serve SPA estática de `src/public/`
- `src/worker.js` — BullMQ Worker, lógica de extração TEI, adição de marcadores de página
- `src/queue.js` — instância compartilhada de Queue + conexão Redis
- `src/db.js` — cliente PostgreSQL (`postgres.js`), schema init, CRUD de users/jobs
- `src/auth.js` — plugin Fastify (`fastify-plugin`) que registra `@fastify/cookie`, `@fastify/jwt`, `@fastify/oauth2`, rotas `/auth/*` e decorator `fastify.authenticate`

**Schema PostgreSQL:**
- `users(id PK, email, name, picture, created_at)` — `id` é o Google `sub`
- `jobs(id PK, user_id FK, original_name, status, result_file, error, created_at, completed_at)`

## Restrições importantes

- Todo código usa **ESM puro** (`"type": "module"`). Não usar `require()` — exceto `pdf-parse` que não suporta ESM e precisa de `createRequire`.
- `pdf-parse` é importado via `createRequire(import.meta.url)` no worker — manter esse padrão.
- `postgres.js` é ESM-nativo — usar tagged templates (`sql\`...\``) para todas as queries, nunca concatenar strings.
- `src/auth.js` usa `fastify-plugin` (fp) — obrigatório para que `fastify.authenticate` e os decorators de JWT estejam disponíveis fora do escopo do plugin.
- `@fastify/cookie` deve ser registrado **antes** de `@fastify/jwt` para que a leitura de cookie funcione.
- Grobid demora 60–90s para iniciar (carrega modelos ML). O healthcheck usa `start_period: 90s`.
- Axios configurado com `maxContentLength/maxBodyLength: Infinity` e timeout de 10 min — necessário para PDFs grandes.
- Worker roda com `concurrency: 1` — Grobid é single-threaded por design.
- `JAVA_OPTS=-XX:-UseContainerSupport` no Grobid corrige NullPointerException do JDK com cgroup v2 (Linux 6.x).
