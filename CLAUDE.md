# Vidsum

Plataforma de video com resumos gerados por IA, inspirada no YouTube.

---

## IMPORTANTE — Antes de qualquer mudança

> **Frontend** (`frontend/`): leia `frontend/CLAUDE.frontend.md` antes de alterar qualquer arquivo.
> **Backend** (`backend/`): leia `backend/CLAUDE.backend.md` antes de alterar qualquer arquivo.

Os arquivos acima contêm todas as regras de código, convenções, estrutura e workflow de verificação obrigatórios para cada área.

---

## Arquitetura

```
                     :80                   :5173
                   ┌───────┐            ┌──────────┐
  browser ──────── │ nginx │ ─── /api → │ backend  │ (FrankenPHP/Octane)
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
- **Proxy**: Nginx Alpine (porta 80 pública)

---

## Scripts

```bash
npm run start     # docker compose up --build (sobe todos os serviços)
npm run stop      # docker compose down
```

---

## Docker Compose

| Serviço    | Imagem            | Porta pública |
|------------|-------------------|---------------|
| postgres   | postgres:16        | 5432          |
| redis      | redis:7-alpine     | 6379          |
| backend    | FrankenPHP/Octane  | — (interna)   |
| frontend   | Node/Vite          | 5173          |
| nginx      | nginx:alpine       | 80            |
| queue      | FrankenPHP (worker)| —             |

---

## CI/CD

### GitHub Actions

| Workflow          | Trigger                           | Steps                                              |
|-------------------|-----------------------------------|----------------------------------------------------|
| `frontend.yml`    | push/PR em `main` com mudanças em `frontend/` | `npm ci` → `tsc --noEmit` → `npm run lint` → `npm test` → `npm audit` |
| `backend.yml`     | push/PR em `main` com mudanças em `backend/`  | `composer install` → `composer lint` → `composer test` |

Todos os quatro checks devem passar antes de mesclar:
- **Backend Lint** — PHPStan nível 8 + Pint
- **Backend Unit Tests** — Pest, SQLite in-memory
- **Frontend Lint & Type Check** — ESLint + `tsc --noEmit`
- **Frontend Test** — Vitest
