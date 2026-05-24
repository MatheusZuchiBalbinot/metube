# Vidsum

Plataforma de vídeo full-stack com pipeline de IA integrado — transcrição automática, geração de metadados e resumos via Gemini. Construída do zero com foco em experiência de produto real.

---

## Funcionalidades

- Upload de vídeos com retomada automática via protocolo tus — a conexão pode cair no meio e o upload continua do byte exato onde parou
- Processamento assíncrono com feedback em tempo real via WebSocket — o usuário acompanha cada etapa sem polling
- Transcrição automática do áudio com Whisper ASR self-hosted e estimativa de tempo restante
- Sugestões de título, descrição e tags geradas por IA (Gemini) — o dono aceita ou descarta
- Resumos estruturados por IA: pontos-chave, capítulos com timestamp e modo leitura
- Recomendações server-side com scoring por afinidade de tags e histórico do usuário
- Player com streaming adaptativo HLS/DASH (Shaka Player), legendas e picture-in-picture
- Feed de Shorts — scroll vertical estilo YouTube Shorts com volume persistente entre vídeos
- Sistema de reações (like/dislike/save), inscrições em canais, histórico de visualizações
- Playlists com reordenação via drag-and-drop
- Busca com full-text search (PostgreSQL `tsvector` + índice GIN)
- Notificações em tempo real: novo inscrito, like, vídeo publicado, transcrição concluída
- Analytics passiva: impressões em batch, cliques, buscas, tempo assistido, skips
- Múltiplos temas e cores de acento, persistidos por usuário
- Sincronização de estado entre abas via `storage` events

---

## Backend

Arquitetura em camadas com responsabilidades bem separadas:

- **Controllers thin** — parse → authorize → service → resource. Nenhum controller acessa o banco diretamente ou contém lógica de negócio
- **Service layer** — toda lógica de negócio centralizada em services injetados via DI, testados em isolamento
- **DTOs tipados** (`app/Data/`) — o controller passa `$request->validated()` para um DTO antes de chamar o service
- **Event-driven para side effects** — `VideoService` dispara `VideoPublished`; listeners reagem sem que o service precise conhecê-los. Novo side effect = novo listener, sem tocar no service
- **Eloquent Observers para cache** — `VideoObserver`, `PlaylistObserver`, `UserObserver` invalidam cache ao detectar mudanças nos models, independente de quem os alterou
- **Authorization via Policies** — `VideoPolicy`, `PlaylistPolicy`, `CommentPolicy` centralizam regras de ownership
- **Views bufferizadas no Redis** — `INCR` por visualização + flush periódico em batch, sem lock em `UPDATE` concorrente em vídeos virais
- **PHPStan nível 8** — zero `mixed` implícito, todo método público documentado com `@param`/`@return`/`@throws`, propriedades de model com `@property` tipados

**Testes:** 422 testes unitários, 811 assertions, SQLite in-memory. Todo service, model e job crítico tem cobertura dedicada.

---

## Frontend

Arquitetura orientada a hooks com separação clara entre lógica e renderização:

- **Componentes como orquestradores** — chamam hooks e renderizam JSX. Qualquer lógica que não seja renderização fica em um hook
- **Hooks locais de página** — lógica específica de uma página fica em `pages/[page]/hooks/`, nunca em `src/hooks/` global. Evita acoplamento falso e deixa claro o escopo de cada abstração
- **Redux para estado global** — vídeos, likes, playlists, user. Estado de UI local (`useState`) para tudo que é específico de um componente
- **Branded types** — `VideoId`, `Vuid`, `Puid`, `Cuid` são tipos distintos em compile time. Impossível passar um ID de playlist onde se espera um ID de vídeo
- **Domain puro em `src/domain/`** — lógica de negócio sem efeitos colaterais, 100% de cobertura de testes, exposta como namespace object (`domain.video.isPublished(v)`)
- **ApiResult\<T\>** — todos os métodos de API retornam `{ ok: true; data: T } | { ok: false; error: string }`. Sem try/catch espalhado, sem propagação de erros como throw
- **ESLint com complexidade máxima 8** por função, `no-explicit-any` como erro, `react-hooks/exhaustive-deps` obrigatório, zero single-line blocks

**Testes:** 1.026 testes em 81 arquivos. Domínio em 100%, store Redux em ~92% de statements.

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
