# Vidsum

Plataforma de vídeo full-stack com pipeline de IA integrado — transcrição automática, geração de metadados e resumos via Gemini. Construída do zero com foco em experiência de produto real.

---

## Funcionalidades

- Upload de vídeos com retomada automática via protocolo tus — a conexão pode cair no meio e o upload continua do byte exato onde parou
- Processamento assíncrono com feedback em tempo real via WebSocket
- Transcrição automática do áudio com Whisper ASR
- Sugestões de título, descrição e tags geradas por IA
- Resumos estruturados por IA: pontos-chave, capítulos com timestamp e modo leitura
- Recomendações server-side com scoring por afinidade de tags e histórico do usuário
- Player com streaming adaptativo HLS/DASH, legendas e picture-in-picture
- Feed de Shorts — scroll vertical estilo YouTube Shorts com volume persistente entre vídeos
- Sistema de reações (like/dislike/save), inscrições em canais, histórico de visualizações, playlists e mais
- Busca com full-text search (PostgreSQL `tsvector` + índice GIN)
- Notificações em tempo real: novo inscrito, like, vídeo publicado, transcrição concluída
- Analytics passiva: impressões em batch, cliques, buscas, tempo assistido, skips
- Múltiplos temas e cores de acento, persistidos por usuário
- Sincronização de estado entre abas via `storage` events

---

## Backend

Segue arquitetura **MVC** com **Service Layer**, aplicando princípios **SOLID** e **Clean Code**:

- **MVC com controllers thin** — única responsabilidade: receber, autorizar e delegar ao service
- **Service Layer** com toda a lógica de negócio, injetada via **Dependency Injection**
- **Observer Pattern** para invalidação de cache — models notificam o cache automaticamente ao mudar
- **Event/Subscriber Pattern** para side effects — eventos de domínio desacoplam o disparo da reação
- **DTOs** tipados entre controller e service — o `$request` nunca atravessa camadas
- **Policy-based Authorization** — regras de ownership centralizadas, fora dos controllers
- PHPStan nível 8 com documentação obrigatória em todos os métodos públicos
- +90% de cobertura nos services, models e jobs críticos — 422 testes, 811 assertions

---

## Frontend

Segue arquitetura **orientada a hooks** com separação estrita entre lógica e renderização:

- **Container/Presenter** adaptado ao React — componentes orquestram hooks e renderizam JSX
- **Domain Layer** puro em `src/domain/` — lógica de negócio sem efeitos colaterais, 100% coberta por testes
- **Flux/Redux** para estado global com seletores memoizados; estado de UI local fica em `useState`
- **Branded types** (`VideoId`, `Vuid`, `Puid`) — segurança de tipos em compile time, sem overhead em runtime
- **ApiResult\<T\>** como contrato de API — tratamento de erro uniforme, sem `try/catch` espalhado
- ESLint com complexidade ciclomática máxima de 8 e `no-explicit-any` como erro
- +90% de cobertura nas partes críticas — domínio em 100%, store em ~92% — 1.026 testes em 81 arquivos

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
