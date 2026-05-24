# Vidsum

Plataforma de vídeo full-stack com pipeline de IA integrado — upload, processamento assíncrono, transcrição automática e geração de metadados via Gemini. Construída do zero com foco em experiência de produto real: streaming adaptativo, feed de shorts com scroll vertical, notificações em tempo real, sistema de playlists com drag-and-drop e uma camada de analytics própria.

---

## O que tem dentro

**Para o usuário:**
- Upload de vídeos com retomada automática (protocolo tus) — a conexão pode cair no meio do upload e ele continua de onde parou
- Processamento assíncrono com feedback em tempo real via WebSocket — o usuário vê cada etapa: processando → transcrevendo → sugestões prontas
- Transcrição automática do áudio com estimativa de tempo (Whisper ASR)
- Sugestões de título, descrição e tags geradas por IA (Gemini) — o dono do vídeo aceita ou descarta
- Player com streaming adaptativo HLS/DASH (Shaka Player), múltiplas legendas e modo picture-in-picture
- Feed de Shorts — scroll vertical estilo TikTok/YouTube Shorts com controle de volume persistente entre vídeos
- Playlists com reordenação via drag-and-drop
- Sistema de reações (like/dislike/save), inscrições em canais e histórico de visualizações
- Busca com full-text search (PostgreSQL `tsvector` + índice GIN)
- Notificações em tempo real: novo inscrito, like no comentário, vídeo publicado, transcrição concluída
- Resumos estruturados por IA: pontos-chave, capítulos com timestamp e modo leitura
- Analytics passiva: impressões em batch, cliques, buscas, tempo assistido, skips

**Para o sistema:**
- Sistema de cache com invalidação reativa por Eloquent Observers (feeds, canais, playlists, recomendações)
- Recomendações server-side com scoring por afinidade de tags e histórico do usuário
- Contador de views bufferizado no Redis para vídeos virais — sem lock em `UPDATE` concorrente
- Sincronização de estado entre abas do browser via `storage` events
- Logout forçado via `session_version` — invalida todas as sessões ativas do usuário com uma operação no banco
- Rate limiting granular por IP e por e-mail em endpoints sensíveis
- Suporte a múltiplos temas e cores de acento, persistidos por usuário

---

## Stack

| Camada      | Tecnologia                                              | Por quê                                          |
|-------------|----------------------------------------------------------|--------------------------------------------------|
| Frontend    | React 19 + TypeScript + Vite (rolldown) + Redux Toolkit  | Ecossistema maduro, React Compiler em preview    |
| Backend     | Laravel 12 + FrankenPHP/Octane                           | Boot zero por request, imagem Docker compacta    |
| Auth        | Laravel Sanctum (cookie de sessão stateful)              | Logout forçado e rotação de sessão sem complexidade JWT |
| Banco       | PostgreSQL 16                                            | Full-text search nativo, `tsvector`, GENERATED columns |
| Cache/Fila  | Redis 7 + Laravel Horizon                                | Visibilidade de throughput, filas separadas por prioridade |
| WebSockets  | Laravel Reverb                                           | Sem custo de terceiro, self-hosted, Pusher-compatible |
| Upload      | tus-php + tus-js-client                                  | Protocolo aberto de upload resumável             |
| Transcrição | Whisper ASR (self-hosted)                                | Privacidade, sem custo por minuto de áudio       |
| IA          | Google Gemini (REST API)                                 | JSON estruturado nativo, custo baixo             |
| Proxy       | Nginx Alpine                                             | Único ponto de entrada, sem CORS em dev          |
| CSS         | Tailwind CSS 4 + design tokens BEM                       | Tokens globais no `:root`, temas via `data-*`    |

---

## Arquitetura

```
                     :80
  browser ─── nginx ──┬── /api/* ─────► backend (Octane :8000)
                      │                    │
                      └── /*  ───────► frontend (Vite :5173)
                                           │
                             postgres :5432 ◄─── backend
                             redis    :6379 ◄─── backend, horizon, reverb
                                           │
                            horizon ───────┴── transcription queue ──► whisper
                                           │                    └──► gemini
                            reverb  ───────┴── WebSocket :8080 ──► browser
```

---

## Pipeline de IA

Após o processamento do vídeo, um pipeline assíncrono encadeado entra em ação:

```
ProcessVideoUpload
      │
      ▼
TranscribeVideo (Whisper)
  → cria Transcription(status=PROCESSING)
  → broadcast: status + ETA para o browser
  → ao concluir: Transcription(status=COMPLETED)
  → broadcast: transcrição disponível
      │
      ▼
GenerateAiMetadata (Gemini)
  → envia transcrição como contexto
  → resposta: JSON estruturado { title, description, tags }
  → cria VideoAiSuggestion(status=PENDING)
  → broadcast: sugestões prontas para revisão
      │
      ▼
Dono do vídeo aceita ou descarta via interface
```

O usuário vê o progresso de cada etapa em tempo real sem polling. As sugestões nunca são aplicadas automaticamente — o dono sempre tem a última palavra.

---

## Como rodar

```bash
cp backend/.env.example backend/.env
cp .env.example .env
cp .env.postgres.example .env.postgres

npm run start   # docker compose up --build
```

Acesse em `http://localhost`. O frontend com HMR está em `http://localhost:5173`.

```bash
npm run stop    # docker compose down
```

| Serviço   | Porta | Descrição                         |
|-----------|-------|-----------------------------------|
| nginx     | 80    | Proxy principal (entry point)     |
| frontend  | 5173  | Vite dev server com HMR           |
| postgres  | 5432  | PostgreSQL 16                     |
| redis     | 6379  | Redis 7                           |

---

## CI/CD

Dois workflows independentes no GitHub Actions, disparados apenas quando os arquivos relevantes mudam:

| Workflow       | Checks                                              |
|----------------|-----------------------------------------------------|
| `frontend.yml` | `tsc --noEmit` → ESLint → Vitest → `npm audit`      |
| `backend.yml`  | PHPStan nível 8 + Pint → Pest (SQLite in-memory)    |

PRs só mergem com todos os checks verdes. PHPStan nível 8 significa tipagem estrita: sem `mixed` implícito, sem `@var` inline, sem elvis operator.

---

## Estrutura do repositório

```
.
├── backend/     Laravel 12 — API REST, jobs, events, observers, services
├── frontend/    React 19 — SPA, Redux, player, shorts, upload
├── whisper/     Dockerfile do serviço Whisper ASR (self-hosted)
├── nginx/       Configuração do proxy reverso
└── docker-compose.yml
```

Guias técnicos detalhados por área:
- [`frontend/CLAUDE.frontend.md`](frontend/CLAUDE.frontend.md) — aliases, padrões de componentes, ESLint, Redux, testes
- [`backend/CLAUDE.backend.md`](backend/CLAUDE.backend.md) — rotas, serviços, PHPStan, cache, fila, upload
