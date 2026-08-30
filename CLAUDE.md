# MeTube

Plataforma de video com resumos gerados por IA, inspirada no YouTube.

---

## REGRA OBRIGATÓRIA — Primeira ação de qualquer tarefa

Antes de escrever qualquer código, leia o guia da área:

- **Frontend** (`frontend/`): leia `frontend/CLAUDE.frontend.md` **completo**
- **Backend** (`backend/`): leia `backend/CLAUDE.backend.md` **completo**

Não comece a codificar antes de ter lido o guia. Esses arquivos contêm todas as regras de código, convenções, estrutura e workflow de verificação obrigatórios para cada área.

---

## Arquitetura

```
                     :80                   :5173
                   ┌───────┐            ┌──────────┐
  browser ──────── │ caddy │ ─── /api → │ backend  │ (FrankenPHP/Octane)
                   └───┬───┘            └────┬─────┘
                       │                     │
                   ┌───┴───┐          ┌──────┴─────┐
                   │ front │          │  postgres   │ :5432
                   │ (Vite)│          │  redis      │ :6379
                   └───────┘          └────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite (porta 5173 interna)
- **Backend**: Laravel 12 + FrankenPHP/Octane (porta 8000 interna)
- **Auth**: Laravel Sanctum stateful (cookie de sessão, nunca JWT)
- **DB**: PostgreSQL 16
- **Cache/Sessions**: Redis 7
- **Proxy**: Caddy 2 (porta 80/443 pública; TLS automático em produção)

---

## Scripts

```bash
npm run start     # docker compose up --build (sobe todos os serviços)
npm run stop      # docker compose down
```

---

## Docker Compose

| Serviço    | Imagem/Build       | Porta pública | Observação                                   |
|------------|--------------------|---------------|-----------------------------------------------|
| postgres   | postgres:16         | 5432          |                                                 |
| redis      | redis:7-alpine      | 6379          |                                                 |
| backend    | build `./backend` (FrankenPHP/Octane) | — (interna) |                             |
| horizon    | build `./backend`  | — (interna)   | `php artisan horizon` — workers de fila       |
| reverb     | build `./backend`  | — (interna)   | `php artisan reverb:start` — WebSockets       |
| whisper    | build `./whisper`  | — (interna)   | Opcional — atrás do profile `whisper`; omita para usar uma API hospedada via `WHISPER_URL` |
| frontend   | build `./frontend` (Vite) | 5173    |                                                 |
| caddy      | caddy:2-alpine      | 80 / 443      | TLS automático em produção                    |

Esta tabela reflete `docker-compose.yml` — confira o arquivo se um serviço novo for
adicionado (`grep '^  [a-z_-]*:$' docker-compose.yml`).

---

## CI/CD

### GitHub Actions

Não hand-mantenha uma tabela de workflows aqui — a pasta ganha workflows novos sem aviso
(ex.: `whisper.yml` foi adicionado depois deste guia ter sido escrito pela primeira vez). Para
a lista atual: `ls .github/workflows/`. Como referência, os workflows atuais no momento desta
revisão:

| Workflow                | Escopo                                                        |
|--------------------------|----------------------------------------------------------------|
| `backend-lint.yml`       | PHPStan nível 8 + Pint (Backend Lint)                          |
| `backend-quality.yml`    | PHP Insights (Backend Quality)                                 |
| `backend-tests.yml`      | Pest, SQLite in-memory (Backend Tests)                         |
| `frontend.yml`           | ESLint + `tsc --noEmit` (Frontend Lint & Type Check)            |
| `frontend-test.yml`      | Vitest (Frontend Test)                                          |
| `frontend-security.yml`  | `npm audit`                                                    |
| `security-scan.yml`      | Scan de segurança geral do repositório (ex.: Trivy)             |
| `whisper.yml`            | Testes do serviço `whisper/`                                    |
| `docs-drift.yml`         | `scripts/check-docs-drift.sh` — falha se um caminho citado entre crases nos guias não existir mais no disco |

Todos os checks relevantes à área alterada devem passar antes de mesclar.
