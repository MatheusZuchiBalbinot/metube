# Vidsum

Plataforma de vídeo full-stack com pipeline de IA integrado — transcrição automática, geração de metadados e resumos via Gemini. Construída do zero com foco em experiência de produto real.

---

## Por que esse projeto é diferente

- **Pipeline de IA completo e encadeado** — após o upload, o vídeo é transcrito automaticamente (Whisper), os metadados são gerados por IA (Gemini) e o dono pode aceitar ou descartar as sugestões. Tudo assíncrono, com feedback em tempo real via WebSocket sem polling.
- **Cobertura de testes em partes críticas** — domínio do frontend em **100%**, store Redux em ~92%, e 1.448 testes no total (1.026 frontend + 422 backend com 811 assertions). Todo service do backend tem teste unitário dedicado.
- **Arquitetura em camadas no backend** — controllers thin que só orquestram (parse → authorize → service → resource), service layer com toda a lógica de negócio, DTOs tipados, event-driven para side effects e Eloquent Observers para invalidação reativa de cache.
- **Frontend orientado a hooks** — componentes são orquestradores: chamam hooks e renderizam JSX. Lógica de página fica em `pages/[page]/hooks/`, nunca misturada com renderização ou em hooks globais que não precisam ser globais.
- **Upload resumável** — protocolo tus garante que a conexão pode cair no meio de um upload de 2 GB e o cliente retoma do byte exato onde parou, sem reenviar nada.
- **Qualidade estática sem concessão** — PHPStan nível 8 no backend (zero `mixed` implícito, todo método público documentado), TypeScript strict + branded types no frontend (`VideoId`, `Vuid`, `Puid`) que impedem mistura de IDs em compile time, e ESLint com complexidade ciclomática máxima de 8 por função.
- **Realtime sem terceiros** — Laravel Reverb self-hosted, compatível com o protocolo Pusher. O browser recebe atualizações de status de vídeo, progresso de transcrição e notificações sem custo externo por conexão.
- **Sistema de cache inteligente** — invalidação reativa via Observers: quando um vídeo muda, o cache de feed, canal e recomendações é invalidado automaticamente, independente de quem fez a alteração.

---

## Stack

- **Frontend** — React 19, TypeScript, Vite (rolldown), Redux Toolkit, Tailwind CSS 4
- **Backend** — Laravel 12, FrankenPHP/Octane, PostgreSQL 16, Redis 7
- **Fila** — Laravel Horizon com filas separadas por prioridade
- **WebSockets** — Laravel Reverb (self-hosted, Pusher-compatible)
- **Upload** — protocolo tus (tus-php + tus-js-client)
- **IA** — Whisper ASR (transcrição, self-hosted) + Google Gemini (metadados e resumos)
- **Auth** — Laravel Sanctum stateful (cookie HttpOnly, sem JWT)
- **Proxy** — Nginx Alpine como único ponto de entrada

---

## Pipeline de IA

```
Upload → ProcessVideoUpload → TranscribeVideo (Whisper) → GenerateAiMetadata (Gemini)
                                      ↓                            ↓
                               broadcast ETA              broadcast sugestões prontas
                                      ↓                            ↓
                            transcrição disponível      dono aceita ou descarta
```

---

## Como rodar

```bash
cp backend/.env.example backend/.env
cp .env.example .env
cp .env.postgres.example .env.postgres

npm run start   # docker compose up --build
npm run stop    # docker compose down
```

Acesse em `http://localhost` (nginx) ou `http://localhost:5173` (Vite com HMR direto).

---

## CI/CD

Cinco workflows no GitHub Actions, disparados apenas quando os arquivos da área mudam:

| Workflow                | O que faz                                        |
|-------------------------|--------------------------------------------------|
| `frontend.yml`          | TypeScript (`tsc --noEmit`) + ESLint             |
| `frontend-test.yml`     | Vitest                                           |
| `frontend-security.yml` | `npm audit --audit-level=high`                   |
| `backend-lint.yml`      | PHPStan nível 8 + Pint                           |
| `backend-tests.yml`     | Pest — `tests/Unit/` com SQLite in-memory        |

---

## Estrutura

```
├── backend/     Laravel 12 — API, services, jobs, events, observers
├── frontend/    React 19 — SPA, Redux, player, shorts, upload
├── whisper/     Whisper ASR self-hosted
├── nginx/       Proxy reverso
└── docker-compose.yml
```

- [`frontend/CLAUDE.frontend.md`](frontend/CLAUDE.frontend.md) — convenções, aliases, ESLint, Redux, testes
- [`backend/CLAUDE.backend.md`](backend/CLAUDE.backend.md) — rotas, serviços, PHPStan, cache, fila, upload
