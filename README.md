# Zpply

Extração de texto de PDFs jurídicos via Grobid, com autenticação Google e interface web.

## Pré-requisitos

- Docker e Docker Compose

## Configuração

Crie `.env` na raiz:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...          # string aleatória longa
BASE_URL=http://localhost:3000
```

No Google Cloud Console, configure o URI de redirecionamento autorizado como `{BASE_URL}/auth/google/callback`.

## Executar

```bash
# Build + start
docker compose up --build

# Só start (sem rebuild)
docker compose up
```

> Grobid demora 60–90s para iniciar (carrega modelos ML). Aguarde antes de processar PDFs.

## Arquitetura

4 serviços Docker: `app` (Fastify HTTP), `worker` (BullMQ), `redis`, `postgres` e `grobid`.

### Fluxo de processamento

1. `POST /upload` — salva PDF, cria job no PostgreSQL e enfileira no BullMQ
2. Worker lê PDF com `pdf-parse`, envia para Grobid
3. Worker extrai texto do TEI XML, insere marcadores `- page N`, salva TXT
4. Worker deleta o PDF original e atualiza status do job
5. `GET /jobs` — lista jobs do usuário autenticado
6. `GET /results/:filename` — download do TXT

### Fluxo de autenticação

1. Frontend chama `GET /auth/me` — se 401, exibe overlay de login
2. Usuário clica "Entrar com Google" → `GET /auth/google`
3. Google redireciona para `GET /auth/google/callback`
4. Server troca code por token, faz upsert em `users`, assina JWT, seta cookie `token` (httpOnly, 7 dias)
5. Redireciona para `/`

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID do OAuth2 Google |
| `GOOGLE_CLIENT_SECRET` | Client Secret do OAuth2 Google |
| `JWT_SECRET` | Secret para assinar tokens JWT |
| `BASE_URL` | URL base da aplicação (ex: `http://localhost:3000`) |

`DATABASE_URL` é montado internamente pelo Docker Compose (`postgresql://zpply:secret@postgres:5432/zpply`).
