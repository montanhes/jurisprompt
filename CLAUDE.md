# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
# Subir tudo (build + start)
docker compose up --build

# Só subir (sem rebuild)
docker compose up
```

### Build do frontend (React)

Sempre rodar **localmente** antes de subir para produção. O Vite builda direto em `src/public/`, que é copiado na imagem Docker.

```bash
# Instalar deps (primeira vez ou após mudança no package.json)
npm run fe:install

# Build de produção → gera src/public/
npm run fe:build

# Dev server com hot reload (proxy para localhost:3000)
npm run fe:dev
```

### Deploy em produção

**NUNCA** usar `docker compose down -v` — destrói os volumes (banco incluído).

```bash
# 1. Build frontend local
npm run fe:build

# 2. Rebuild e reiniciar apenas app e worker (preserva postgres/redis/docling intactos)
docker compose up -d --build --no-deps app worker

# Verificar logs após deploy
docker compose logs -f app worker
```

### Atualizar código sem rebuild de imagem

Se só mudou código em `src/` (sem alterar `package.json` ou `Dockerfile`), basta reiniciar:

```bash
# Reiniciar app e worker (src/ é bind-mounted)
docker compose restart app worker

# Ver logs em tempo real
docker compose logs -f app worker
```

### Testar funcionalidade nova

```bash
# Verificar status de todos os serviços
docker compose ps

# Logs de um serviço específico
docker compose logs -f app
docker compose logs -f worker

# Inspecionar banco (sem derrubar nada)
docker compose exec postgres psql -U zpply -d zpply
```

Não há testes nem linter configurados.

## Variáveis de ambiente obrigatórias

Crie um arquivo `.env` na raiz antes de subir:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...                   # string aleatória longa
BASE_URL=http://localhost:3000

# AbacatePay (opcional em dev — pagamentos desativados se ausente)
ABACATEPAY_API_KEY=...           # chave dev ou prod do painel AbacatePay
ABACATEPAY_WEBHOOK_SECRET=...    # secret configurado no painel de webhooks
```

No painel AbacatePay, configure o webhook para `{BASE_URL}/webhooks/abacatepay?webhookSecret=...` e habilite os eventos `subscription.completed`, `subscription.renewed` e `subscription.cancelled`.

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
