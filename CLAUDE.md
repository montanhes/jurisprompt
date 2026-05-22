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

O `docker-compose.yml` lê essas vars do ambiente/`.env` via `${VAR}`. O `DATABASE_URL` é montado internamente (`postgresql://zpply:secret@postgres:5432/zpply`).

No Google Cloud Console, o URI de redirecionamento autorizado deve ser `{BASE_URL}/auth/google/callback`.

## Arquitetura

5 serviços Docker: `app` (Fastify HTTP), `worker` (BullMQ), `redis`, `docling`, `postgres`.

**Fluxo de processamento:**
1. `POST /upload` (autenticado) — server salva PDF em `uploads/`, insere job no PostgreSQL, enfileira no BullMQ
2. Worker pega job, envia o PDF via multipart para Docling `POST /convert`
3. Docling retorna `{ markdown }` — worker salva o `.md` em `results/`
4. Worker deleta o PDF original e atualiza job no PostgreSQL
5. `GET /jobs` — lista jobs do usuário autenticado
6. `GET /results/:filename` — download do MD (verifica ownership via PostgreSQL)

**Fluxo de autenticação:**
1. Frontend chama `GET /auth/me` no load — se 401, exibe landing page de login
2. Usuário clica "Entrar com Google" → `GET /auth/google` (gerado pelo `@fastify/oauth2`)
3. Google redireciona para `GET /auth/google/callback`
4. Server troca code por token, busca userinfo no Google, faz upsert em `users`, assina JWT, seta cookie `token` (httpOnly, SameSite=Lax, 7 dias)
5. Redireciona para `/`

**Módulos:**
- `src/server.js` — Fastify com rotas upload/jobs/results + serve SPA estática de `src/public/`
- `src/worker.js` — BullMQ Worker, chama Docling `/convert`, salva Markdown resultante
- `src/queue.js` — instância compartilhada de Queue + conexão Redis
- `src/db.js` — cliente PostgreSQL (`postgres.js`), schema init, CRUD de users/jobs
- `src/auth.js` — plugin Fastify (`fastify-plugin`) que registra `@fastify/cookie`, `@fastify/jwt`, `@fastify/oauth2`, rotas `/auth/*` e decorator `fastify.authenticate`
- `docling-svc/` — serviço Python que expõe Docling via FastAPI (`POST /convert`, `GET /health`)

**Schema PostgreSQL:**
- `users(id PK, email, name, picture, created_at)` — `id` é o Google `sub`
- `jobs(id PK, user_id FK, original_name, status, result_file, error, created_at, completed_at)`

## Restrições importantes

- Todo código usa **ESM puro** (`"type": "module"`). Não usar `require()`.
- `postgres.js` é ESM-nativo — usar tagged templates (`sql\`...\``) para todas as queries, nunca concatenar strings.
- `src/auth.js` usa `fastify-plugin` (fp) — obrigatório para que `fastify.authenticate` e os decorators de JWT estejam disponíveis fora do escopo do plugin.
- `@fastify/cookie` deve ser registrado **antes** de `@fastify/jwt` para que a leitura de cookie funcione.
- Docling demora vários minutos para iniciar (carrega modelos ML). O healthcheck usa `start_period: 600s`.
- Axios configurado com `maxContentLength/maxBodyLength: Infinity` e timeout de 10 min — necessário para PDFs grandes.
- Worker roda com `concurrency: 1` — Docling é CPU-intensivo e não se beneficia de paralelismo no mesmo host.
