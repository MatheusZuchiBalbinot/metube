# MeTube — Backend

API Laravel 12 (FrankenPHP/Octane) para o [MeTube](../README.md): controllers thin, lógica de negócio isolada em services, DTOs tipados entre as camadas, autorização via policies e side effects desacoplados via domain events.

Convenções completas (rotas, services, PHPStan, cache, filas, upload): [`CLAUDE.backend.md`](CLAUDE.backend.md).

Vem com auto-instrumentação **OpenTelemetry** (Laravel + PDO) já instalada, exportando via OTLP — desligada por padrão em dev (`OTEL_EXPORTER_OTLP_HEADERS` vazio). Ver [Observability no README raiz](../README.md#observability-opcional) para habilitar.

---

## Requisitos

* PHP 8.2+
* Composer
* PostgreSQL 16 e Redis 7 (via Docker Compose na raiz do repo, ou instâncias locais)

## Setup

Dentro de `backend/`:

```bash
composer setup   # composer install + .env + APP_KEY + migrations
```

Para rodar junto com o restante da stack (Postgres, Redis, Horizon, Reverb, Whisper, frontend), use `npm run start` na raiz do repo em vez de subir o backend isolado — ver [README raiz](../README.md#como-rodar).

## Comandos

```bash
composer dev         # servidor local + queue:listen + logs (concurrently)
composer test        # Pest, SQLite in-memory
composer lint         # PHPStan nível 8 (--test) + Pint (--test)
composer lint:fix     # Pint auto-formata
composer insights     # PHP Insights — gate de 99% no CI
```

## Estrutura

```text
app/
├── Http/           Controllers, FormRequests, Resources, Middleware
├── Services/        Lógica de negócio, injetada via DI
├── Models/          Eloquent models + Builders/ (queries reutilizáveis — sem scopes)
├── DTOs/            Objetos tipados entre HTTP e services
├── Jobs/            Processamento assíncrono (upload, transcrição, IA)
├── Events/          Domain events (VideoPublished, VideoLiked, ...)
├── Listeners/       Reações a eventos (notificações, invalidação de cache)
├── Observers/        Invalidação de cache reativa por model
├── Policies/         Autorização baseada em ownership
├── AI/               Clients e prompts de IA (interface agnóstica de provider)
└── Support/          Classes de apoio (scoring, storage, upload)
```

Detalhes de cada camada, tabela de rotas atualizada (`php artisan route:list --path=api`) e lista de services: [`CLAUDE.backend.md`](CLAUDE.backend.md).
