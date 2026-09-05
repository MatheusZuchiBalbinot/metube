# Backend — Guia Completo

Stack: **Laravel 12 + FrankenPHP/Octane + PostgreSQL 16 + Redis 7 + Laravel Reverb**

---

## Workflow obrigatório após qualquer mudança

```bash
# 1. Estático
composer lint          # PHPStan nível 8 + Pint format check
composer lint:fix      # Auto-formata com Pint

# 2. Testes
composer test          # Pest, SQLite in-memory

# 3. Só committar se ambos passarem
```

Se `composer lint` retornar erros, corrija antes de commitar. CI rejeita PRs com lint ou testes falhando.

Após qualquer mudança de rota ou service em produção, recarregue o Octane:

```bash
docker exec <backend-container> php artisan octane:reload
```

---

## Estrutura de diretórios

**Esta árvore muda com frequência — os arquivos citados aqui são exemplos do padrão de cada
pasta, não um inventário exaustivo.** Para a lista atual de qualquer pasta, rode
`ls backend/app/<Pasta>/` (ou `git ls-files backend/app/<Pasta>`). Para entender o que uma
classe faz, leia seu docblock — é a fonte de verdade, não este arquivo. Um script de CI
(`scripts/check-docs-drift.sh`) falha o build se um caminho citado entre crases neste guia
não existir mais no disco, mas ele não pega descrições desatualizadas — trate esta árvore
como um mapa aproximado, não um contrato.

```
app/
  AI/                                # Integração com o provider de IA (Groq por padrão)
    Clients/GroqClient.php           # Implementa AiClient — chamada HTTP + parsing da resposta
    Contracts/AiClient.php           # Interface do cliente de IA (troca de provider = nova classe)
    Contracts/AiPrompt.php
    Prompts/                         # Monta os prompts enviados ao AiClient

  Config/                            # Constantes de configuração tipadas (não confundir com config/)
    PaginationSize.php               # Tamanhos de página usados nas queries
    UploadLimits.php                 # Fonte única de limites/mimes/extensões de upload (ver C-13 abaixo)

  Console/Commands/                  # Agendador (PublishScheduledVideos, flush de views, ...)

  Contracts/                         # Interfaces implementadas por Services (DI configurada em AppServiceProvider)
    StorageContract.php              # Abstrai todas as ops de disco (temp + public); implementado por StorageService
    ViewCounterStore.php             # Redis (produção) vs Database (testes) — ver seção Cache

  DTOs/                              # DTOs tipados — criados a partir de $request->validated()
                                      # (chamado de "app/Data/" em versões antigas deste guia — não existe mais)

  Enums/                             # Ver `ls backend/app/Enums/` para a lista atual

  Events/                            # Disparados por services; ouvidos por listeners registrados em AppServiceProvider::registerEventListeners()

  Exceptions/                        # Exceptions de domínio, renderizadas em bootstrap/app.php

  Http/
    Controllers/                     # Thin: parse input → authorize → service → resource
    Middleware/
      CheckSessionVersion.php        # Alias session.version — valida session_version vs DB
    Requests/                        # Um sub-namespace por domínio (Video/, Playlist/, Comment/, Auth/, ...)
      Concerns/                      # Traits de validação compartilhadas entre FormRequests
    Resources/                       # JsonResource — nunca retorne models crus (ver seção Resources abaixo)

  Jobs/                              # Async: upload, transcodificação HLS, transcrição, metadados de IA

  Listeners/                         # Um listener por efeito colateral de evento

  Models/
    Builders/                        # Custom Eloquent Builder por model — TODA query reaproveitável vive aqui, nunca em scopes
                                      # (ver seção "Query Builders" abaixo)

  Observers/                         # Invalidação de cache reativa via Eloquent events (Video/Playlist/User)

  Notifications/                     # Notifications enviadas via Notification facade

  Policies/                          # VideoPolicy, PlaylistPolicy, CommentPolicy — registradas em AppServiceProvider

  Providers/
    AppServiceProvider.php           # Bindings de contract (inclusive o branch Redis/Database do ViewCounterStore), rate limiters, Gate::policy(), Event::listen()

  Services/                          # Ver seção "Serviços" abaixo — não hand-mantenha uma tabela aqui, leia os docblocks

  Support/                           # Helpers sem estado que não são nem Service nem Model
    ScoringSignals.php               # Fórmulas de popularidade/frescor — fonte única usada por RecommendationService e FeedService
    VideoFileManager.php / VideoPayloadBuilder.php

config/
  tus.php                            # upload_dir, ttl, max_size (lido de App\Config\UploadLimits), api_path
  cache.php                          # Grupos de cache da aplicação — ver seção Cache abaixo

routes/
  api.php                            # Todas as rotas REST da API — ver seção "API Routes" abaixo
  channels.php                       # Canais Reverb: users.{uuid} (privado), videos.{vuid} (público)
```

---

## API Routes

Todas as rotas da API estão prefixadas em `/api` via `bootstrap/app.php`, organizadas em
`Route::prefix(...)->group(...)` dentro de `routes/api.php`. Throttles usam named rate
limiters do `AppServiceProvider` — nunca `throttle:N,M` inline.

**Não mantenha uma tabela de rotas hand-escrita aqui — ela sai de sincronia rápido.** Para a
lista completa e sempre atual:

```bash
docker compose exec backend php artisan route:list --path=api
```

### Público vs protegido — a regra, não a lista

`routes/api.php` separa dois blocos com comentários explícitos:
- **"Public"** — login/registro/reset de senha, e um bloco **"Guest-accessible reads"**
  (`GET /feed`, `GET /videos`, `GET /videos/{video}` + `related`/`summary`/`transcription`,
  `GET /videos/{video}/comments`, `GET /channels/{uuid}` + `videos`) que não exige
  `auth:sanctum` — `auth()->user()` é `null` para convidados nessas rotas.
- **"Protected"** (`middleware(['auth:sanctum', 'session.version'])`) — todo o resto,
  incluindo `POST /videos`, reações, progresso, publicação, IA, playlists, notificações e
  analytics.

Dentro do bloco de leitura pública, `GET /videos` é a única rota sem `->can()` — a
autorização para status não-publicado é feita dentro de `IndexVideoRequest::authorize()` +
`VideoService` (que escopa por `channel_id` do usuário autenticado; ver `IndexVideoRequest`
para o raciocínio completo). As rotas de interação (`like`/`dislike`/`save`/`views`/`progress`)
usam `->can('view', 'video')`: um não-dono só pode interagir com vídeos publicados; o dono
pode interagir com os próprios rascunhos.

`POST /videos/{video}/chat` e `POST /videos/{video}/comments` autorizam **dentro do
controller**, não na rota — o parâmetro `{video}` nessas rotas resolve como `string` (vuid),
não como model, então `->can('view', 'video')` no nível de rota não teria o que autorizar.

---

## Identificadores

| Modelo    | Campo  | Tipo           | Geração                       |
|-----------|--------|----------------|-------------------------------|
| User      | `uuid` | ULID (string)  | `Str::ulid()` no `boot()`     |
| Video     | `vuid` | string 11 chars| `Str::random(11)` no `boot()` |
| Playlist  | `puid` | ULID (string)  | `Str::ulid()` no `boot()`     |
| Comment   | `cuid` | string 11 chars| `Str::random(11)` no `boot()` |

- Nunca use `id` inteiro nas URLs — use sempre o identifier público.
- `vuid` e `cuid` **não são UUID v4** — use `exists:videos,vuid` na validação, não `'uuid'`.
- `Comment` usa `getRouteKeyName()` → `'cuid'`, então `{comment}` nas rotas resolve por `cuid`.

---

## Resources (formato das respostas)

Todos os controllers usam JsonResource, em `app/Http/Resources/`. **Nunca retorne models
crus.** A lista de Resources cresce sem aviso neste guia (`ls backend/app/Http/Resources/`
para a atual) — para o formato exato de um payload, leia o `toArray()` do Resource
correspondente, não uma cópia hand-mantida aqui. Dois pontos que não mudam:

- URLs de arquivo (`video_url`, `hls_url`, `thumbnail_url`, legendas) sempre passam por
  `StorageContract` — nunca monte a URL manualmente no Resource.
- Coleções paginadas: `VideoResource::collection($paginator)` → envelope
  `{data: [...], links: {...}, meta: {...}}`.

---

## Middleware

- `auth:sanctum` — autenticação via Sanctum (cookie de sessão, sem JWT)
- `session.version` — alias para `CheckSessionVersion`; compara `session_version` do token com o do banco; força logout se divergente

### Named rate limiters (definidos em `AppServiceProvider::boot()`)

| Nome                 | Limite                               | Aplicado em                             |
|----------------------|--------------------------------------|-----------------------------------------|
| `login`              | 5/min por IP + 10/min por email      | `POST /api/sessions`                    |
| `password-reset`     | 6/min por IP                         | `POST,PATCH /api/password-resets`       |
| `email-verification` | 6/min por IP                         | `POST,GET /api/email-verifications`     |
| `video-chat`         | ver `AppServiceProvider::registerRateLimiters()` | `POST /api/videos/{video}/chat` |

Confirme os limites atuais em `AppServiceProvider::registerRateLimiters()` — este guia lista
os nomes, não os valores exatos, para não sair de sincronia quando um limite é ajustado.

**Nunca use `throttle:N,M` inline nas rotas** — sempre via named limiters com `middleware('throttle:nome')`.

### CSRF — exceção para tus (bootstrap/app.php)

```php
$middleware->validateCsrfTokens(except: ['api/uploads/tus*']);
```

`withoutMiddleware(VerifyCsrfToken::class)` **não funciona** em rotas tus porque o Sanctum
injeta CSRF via `EnsureFrontendRequestsAreStateful` em pipeline próprio, antes do middleware
do controller. A única solução é o `except` no nível do framework.

---

## Modelos — Convenções

### Boot auto-create
`User::boot()` cria automaticamente uma playlist "Watch Later" para todo usuário novo.
**Impacto nos testes:** `User::factory()->create()` → banco já tem 1 playlist. Ajuste contagens.

### Query Builders (não use scopes)

Toda query reaproveitável vive num **Custom Eloquent Builder** em `app/Models/Builders/`, **não** em query scopes. Builders dão métodos tipados, encadeáveis e legíveis (`Video::query()->published()->newestPublished()`), com suporte total ao PHPStan nível 8.

Padrão obrigatório:
```php
// app/Models/Builders/VideoBuilder.php
/** @extends Builder<Video> */
class VideoBuilder extends Builder
{
    public function published(): self
    {
        return $this->where('status', VideoStatus::PUBLISHED);
    }
}

// no model:
public function newEloquentBuilder($query): VideoBuilder  // $query: Query\Builder
{
    return new VideoBuilder($query);
}
```

Regras:
- Métodos do builder retornam `self` (`return $this->...`).
- **Nunca** adicione `@method` no docblock do model — quebra a inferência do Larastan (gera `Collection<stdClass>`). Deixe o retorno do `newEloquentBuilder` tipar.
- Chame estaticamente via `Model::query()->metodo()`; em relations o método resolve sozinho (`$channel->videos()->published()`).
- Não redefina métodos nativos do Eloquent (`oldest`, `latest`, `where*`) — use os nativos.

### VideoBuilder::filter
Full-text search com fallback por driver:
- **PostgreSQL:** usa coluna `search_tsv` (tsvector GIN-indexed) com `to_tsquery`
- **SQLite (testes):** fallback com `LIKE` em `title` e `description`

Tags usam OR: qualquer tag que corresponda inclui o vídeo.

### Carbon nos modelos
Campos `published_at`, `scheduled_at` são cast para `Carbon|null` (nullable — um vídeo em
rascunho não tem `published_at`, um vídeo não agendado não tem `scheduled_at`). Use sempre
`?->` ao acessar métodos do Carbon nesses dois campos (`$video->published_at?->isFuture()`).

### Comment — `is_liked` virtual
Não é coluna. O service injeta `is_liked` como atributo virtual via `setRelation` ou `setAttribute`
após resolver os likes do usuário em bulk para evitar N+1.

### WatchHistory — `watched_hour`
No PostgreSQL é uma coluna `GENERATED ALWAYS AS` (hora truncada). Em SQLite (testes) é coluna plain.
Nunca defina `watched_hour` manualmente no PostgreSQL; nos testes, defina para que o `insertOrIgnore` funcione.

---

## Enums

Todos vivem em `app/Enums/` — rode `ls backend/app/Enums/` para a lista atual (cresce sem
aviso neste guia); cada arquivo é curto o bastante para ler direto quando precisar dos
valores exatos. Os mais referenciados no resto deste guia: `VideoStatus`
(`published`/`scheduled`/`processing`/`draft`/`failed`), `TranscriptionStatus`,
`AiSuggestionStatus`, `ReactionType` (`like`/`dislike`), `NotificationType`, `PlaylistName`
(`Watch Later`, nome reservado auto-criado no boot) e `HistoryPeriod`
(`today`/`week`/`month`/`all`).

---

## PHPStan — Regras obrigatórias

Nível 8. `composer lint` deve passar sem erros.

### Documentação obrigatória em todo método público

```php
/**
 * Descrição do que faz.
 *
 * @param  TipoA  $paramA  Descrição
 * @param  TipoB  $paramB  Descrição
 * @return TipoRetorno     Descrição
 *
 * @throws \ExceptionClass Quando e por quê
 */
public function metodo(TipoA $paramA, TipoB $paramB): TipoRetorno
```

- Toda propriedade de model deve ter `@property` com tipo correto (use `\Illuminate\Support\Carbon`, não `string`, para datas).
- `@var` inline proibido. Corrija a causa raiz do erro de tipo.
- Elvis operator `?:` proibido (`ternary.shortNotAllowed`). Use `!== null ? ... : ...`.
- `readStream()` retorna `resource|null` — faça null-guard antes de passar para `put()`.
- Custom Builders: métodos retornam `self`; nunca anote `@method` no model (quebra a inferência do Larastan). Ver "Query Builders".

### Verificar antes de commitar

```bash
composer lint        # deve imprimir "[OK] No errors"
composer lint:fix    # auto-formata (Pint)
composer test        # todos os testes passam
```

---

## Testes — Convenções

Framework: **Pest** (nunca PHPUnit raw). Sempre use `describe()` + `test()`.

### Ambiente de teste

- SQLite in-memory (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`)
- Array drivers para session e cache (`SESSION_DRIVER=array`, `CACHE_STORE=array`)
- `QUEUE_CONNECTION=sync`
- `RefreshDatabase` em cada arquivo Feature

### Login e rate limiter

O throttle de login usa cache. Como o driver é `array` (in-process), o estado persiste entre testes do mesmo processo. Todo arquivo que testa login deve limpar o cache:

```php
use Illuminate\Support\Facades\Cache;
uses(RefreshDatabase::class);
beforeEach(fn () => Cache::flush());
```

### Fake de storage e queue

```php
Queue::fake();
Storage::fake('local');
// ... depois
Queue::assertDispatched(ProcessVideoUpload::class);
```

### Convenções de nomenclatura

| Artefato novo       | Arquivo de teste                                          |
|---------------------|-----------------------------------------------------------|
| Enum                | `tests/Unit/Enums/NomeTest.php`                           |
| Model               | `tests/Unit/Models/NomeTest.php`                          |
| Service             | `tests/Unit/Services/NomeTest.php`                        |
| Controller          | `tests/Feature/Http/Controllers/NomeControllerTest.php`   |
| FormRequest         | `tests/Unit/Requests/NomeRequestTest.php`                 |
| Job                 | `tests/Unit/Jobs/NomeJobTest.php`                         |

Todo arquivo novo de produção exige arquivo de teste correspondente. PRs sem testes são rejeitados pelo CI.

### Exemplo completo de teste de controller

```php
<?php

use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);
beforeEach(fn () => Cache::flush()); // apenas se testar login

describe('VideoController', function () {
    test('index returns paginated videos', function () {
        $user = User::factory()->create();
        Video::factory(5)->for($user, 'channel')->create();

        $response = $this->actingAs($user)->getJson('/api/videos');

        $response->assertOk();
        $response->assertJsonCount(5, 'data');
    });
});
```

---

## Serviços — Responsabilidades

Controllers são thin: recebem request, autorizam, chamam service, formatam resposta. **Lógica de negócio fica no service.**

**Não hand-mantenha uma tabela de serviços aqui** — `app/Services/` cresce e se divide com
frequência (já passou de um `VideoService` monolítico para vários services focados; ver
docblock de `VideoService.php`, que documenta explicitamente para onde cada responsabilidade
de escrita foi delegada). Para a lista atual: `ls backend/app/Services/`. Para a
responsabilidade de cada um, leia o docblock da classe — cada service tem um resumo de 1-3
linhas no topo do arquivo.

Pontos estruturais que não mudam com a mesma frequência:
- **`Video*Service` é dividido por operação, não um deus-service.** `VideoService` é
  somente-leitura; criação/finalização/exclusão, publicação, reações, progresso e IA vivem
  em services irmãos dedicados — comece pelo docblock de `VideoService` para o mapa completo.
- **`StorageService`** é a única classe que chama `Storage::disk()` diretamente e implementa
  `StorageContract`. Trocar de disco (local → S3) é mudar env, nunca código —
  `grep -rn "Storage::" backend/app` fora de `StorageService.php` deve retornar zero.
- **IA** — o cliente ativo é `App\AI\Clients\GroqClient` (implementa `AiClient`, bindado em
  `AppServiceProvider::register()`); trocar de provider é criar outra implementação de
  `AiClient` e mudar o bind, não editar os services que o consomem.
- **`ViewCounterStore`** tem duas implementações (`RedisViewCounterStore` em produção,
  `DatabaseViewCounterStore` em testes) — o branch entre elas vive em
  `AppServiceProvider::register()`, nunca dentro de um service.
- **`CacheService`** é a única classe autorizada a chamar `Cache::remember`/`Cache::tags`
  diretamente para os grupos de cache da aplicação (ver seção Cache abaixo).

---

## Upload de vídeo — Fluxo assíncrono

### Modo 1: Upload direto (multipart/form-data)

```
POST /api/videos { video_file, thumbnail_file?, title, ... }
  → StoreVideoRequest — mimes/tamanho validados contra App\Config\UploadLimits (fonte única)
  → VideoUploadService::createVideo() / handleUpload()
     → salva arquivo em uploads/tmp/{vuid}.ext (disco local, privado)
     → cria Video com status=PROCESSING
     → dispatch ProcessVideoUpload
  → retorna 202 com VideoResource
```

### Modo 2: Upload resumável via tus (padrão do frontend)

```
1. POST /api/uploads/tus
     → TusController::handle()
     → tus-php cria sessão Redis com prefixo tus:server:
     → listener tus-server.upload.created → Cache::put("tus:owner:{key}", userId)
     → responde 201 Location: /api/uploads/tus/{key}

2. PATCH /api/uploads/tus/{key}  (N vezes, 5 MB por chunk)
     → TusController::handle() — escreve chunk no arquivo
     → responde 204 com Upload-Offset atualizado

3. POST /api/videos { upload_key: "{key}", title, description, tags, status, ... }
     → StoreVideoRequest — valida owner via Cache::get("tus:owner:{key}") (mesma classe, mesmas
       regras de metadata do modo direto — `ValidatesVideoMetadata` é compartilhado)
     → VideoController::store() → detecta $request->has('upload_key')
     → VideoUploadService::finalizeUpload()
        → TusResolverContract (implementado por TusUploadResolver, prefixo tus:server:) — busca
          metadata do arquivo montado
        → VideoFileManager::moveVideoFromTus() — extensão do nome enviado pelo cliente é
          checada contra App\Config\UploadLimits::VIDEO_EXTENSIONS antes de virar caminho em disco
          (allowlist — nunca aceita a extensão bruta; ver C-02/C-13 no histórico de auditoria)
        → assertAllowedMime() — verifica o *conteúdo real* do arquivo montado via finfo contra
          UploadLimits::VIDEO_MIME_TYPES; o upload tus não passa pelas regras `mimes:` do
          Laravel (só o campo de metadata passa), então esta é a única validação de tipo real
          desse caminho
        → cria Video com status=PROCESSING dentro de uma transação
        → dispatch ProcessVideoUpload (afterCommit)
        → deleta entrada tus no Redis + Cache owner
     → retorna 202 com VideoResource
```

### ProcessVideoUpload::handle()
```
→ VideoStorageService::publishVideo()    → uploads/tmp/{vuid}.ext → storage/app/public/videos/{vuid}.ext
→ VideoStorageService::publishThumbnail() → uploads/tmp/thumb_{vuid}.ext → storage/app/public/thumbnails/{vuid}.jpg
→ atualiza video_url, thumbnail_url, status, published_at
→ dispara VideoStatusUpdated + (se publicado) VideoPublished
```

### ProcessVideoUpload::failed()
```
→ cleanupTmp — deleta arquivos temporários
→ video.status = FAILED
→ dispara VideoStatusUpdated
```

O worker é o serviço `queue` no docker-compose: `php artisan queue:work redis --tries=3 --timeout=3600`.

### config/tus.php

| Chave        | Valor padrão                                              | Descrição                                     |
|--------------|------------------------------------------------------------|-----------------------------------------------|
| `upload_dir` | `storage_path('app/private/uploads/tus')`                  | Onde os chunks são montados durante o upload  |
| `ttl`        | `21600` (6h)                                                | TTL do Cache owner no Laravel                 |
| `max_size`   | `App\Config\UploadLimits::VIDEO_MAX_BYTES` (2 GB), via `TUS_MAX_UPLOAD_BYTES` | Limite por upload — deliberadamente o mesmo teto de `StoreVideoRequest`, não um valor independente (ver C-13 no histórico de auditoria) |
| `api_path`   | `/api/uploads/tus`                                          | Deve bater com a rota em api.php              |

### Gotcha — prefixo do TusRedisStore

O `TusServer` define o prefixo Redis via reflection: `'tus:' + strtolower(ShortName) + ':'` → **`tus:server:`**.

Ao instanciar `TusPhp\Cache\RedisStore` manualmente, o prefixo padrão é `tus:`, não `tus:server:`.
**`App\Services\Tus\TusUploadResolver` (implementa `TusResolverContract`) já encapsula isso** —
chama `setPrefix('tus:server:')` uma vez no construtor. Nunca instancie `RedisStore` diretamente
fora dela; injete `TusResolverContract` e use `get()`/`delete()`/`clearOwnerCache()`.

### Gotcha — Location header no Vite proxy

O tus-php monta a `Location` usando o `Host` do request. Com `changeOrigin: true` no proxy do Vite,
o `Host` vira `backend:8000` (inacessível pelo browser). O `vite.config.ts` tem um `configure` handler
que reescreve o header de resposta:

```ts
configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes, req) => {
        const location = proxyRes.headers['location'];
        if (typeof location === 'string') {
            proxyRes.headers['location'] = location.replace(
                /^https?:\/\/[^/]+/,
                `http://${req.headers.host}`,
            );
        }
    });
},
```

---

## Events e Listeners

Registrados em `AppServiceProvider::boot()` → `registerEventListeners()`. **Não
hand-mantenha uma tabela evento→listener aqui** — as pastas `app/Events/` e `app/Listeners/`
crescem e são renomeadas com frequência (ex.: o antigo evento único `TranscriptionStatusUpdated`
foi desde então dividido em `VideoTranscriptionStarted`/`VideoTranscriptionCompleted`, cada um
com seu próprio listener). Para o mapeamento atual, leia `registerEventListeners()`
diretamente — é uma lista plana de `Event::listen(Evento::class, Listener::class)`, mais fácil
de conferir ali do que de manter duplicada aqui.

O padrão estrutural que se mantém:
- Eventos de comportamento do usuário (`VideoViewed`, `VideoReactionApplied`, `VideoSaved`,
  `VideoFinished`, `VideoSkipped`, os `Un*` equivalentes, `VideoImpressed`,
  `VideoClickedFromFeed`, `ChannelSubscribed`/`ChannelUnsubscribed`, `SearchPerformed`)
  alimentam `LogUserAnalytic`, que persiste qualquer evento que implemente `LoggableUserEvent`.
- Eventos de mudança de estado de vídeo (publicação, transcrição, sugestão de IA) tipicamente
  disparam tanto uma notificação (`Send*Notification`/`Send*Listener`) quanto, quando
  relevante, um broadcast Reverb — como listeners separados do mesmo evento, não a mesma
  classe fazendo as duas coisas.

### Broadcasting (Reverb)
Canais definidos em `routes/channels.php`:

| Canal             | Tipo    | Autorização                        |
|-------------------|---------|------------------------------------|
| `users.{uuid}`    | Privado | `$user->uuid === $uuid`            |
| `videos.{vuid}`   | Público | sempre `true`                      |

Para a lista atual de eventos que fazem broadcast em `videos.{vuid}` (status de
processamento, progresso de transcrição, prontidão de sugestão de IA, ...), busque as classes
que implementam `ShouldBroadcast`: `grep -l ShouldBroadcast backend/app/Events/*.php`.

---

## Cache

Toda operação de cache passa pelo `CacheService` — nunca use `Cache::remember`/`Cache::tags`
diretamente nos services/controllers. Cada grupo tem TTL e flag `active` configurados em
`config/cache.php` sob a chave **`metube.*`** (não `vidsum.*` — o nome do projeto é MeTube; a
pasta do repositório se chamar `vidsum` é só o diretório local, não o namespace de config).
`CacheService::remember()`/`rememberFlexible()` leem literalmente `config("cache.metube.{$group}.active")`
e `...ttl` — se este guia algum dia disser algo diferente de `metube`, o guia está errado, não
o código: seguir uma chave que não existe faz `config()` retornar `null` → `(bool) null` →
`false` → **o cache daquele grupo é desligado silenciosamente**, sem erro nem log.

Grupos atuais (chave, TTL) — confira `config/cache.php` para a lista exata, ela ganha grupos
novos sem aviso:

| Grupo (`cache.metube.*`)     | Tag(s) usada em `CacheService`      | Invalidado por                                        |
|-------------------------------|--------------------------------------|--------------------------------------------------------|
| `feed`                         | `feed` (+ `user:{id}` no feed logado) | `VideoObserver`                                        |
| `channel.info`                 | `channel:{uuid}`                     | `VideoObserver`, `InvalidateCacheSubscriber`            |
| `channel.videos`               | `channel:{uuid}`                     | `VideoObserver`, `InvalidateCacheSubscriber`            |
| `video.meta`                   | `video:{vuid}`                       | `VideoObserver`                                         |
| `video.summary`                | `video:{vuid}`                       | `VideoObserver` (cacheado `forever()`; nunca cacheia `null`) |
| `user.playlists`               | `user:{id}`                          | `UserObserver`, `PlaylistObserver`, `InvalidateCacheSubscriber` |
| `user.subscriptions`           | `user:{id}`                          | `InvalidateCacheSubscriber`                             |
| `user.history_events`          | `user:{id}`                          | `InvalidateCacheSubscriber`                             |
| `recommendations`              | `user:{id}`                          | `VideoObserver`                                         |

`feed` e `recommendations` usam `Cache::flexible()` (stale-while-revalidate) via
`rememberFlexible()`; os demais usam `remember()` simples. Ver o docblock de `CacheService`
para os detalhes do mecanismo fresh/stale.

Cache de views usa Redis diretamente via `RedisViewCounterStore` (não via `CacheService` — é
um buffer de contador, não um cache de leitura):
- `INCR metube:views:pending:{id}` em cada visualização
- `SADD metube:views:dirty {id}` para marcar vídeos sujos
- Flush periódico via `App\Console\Commands\FlushVideoViews` (scheduled command)

---

## Horizon

Laravel Horizon gerencia e monitora as filas Redis. Habilitado em produção; interface protegida por `Horizon::auth()` em `AppServiceProvider`.

```bash
php artisan horizon          # Inicia workers com supervisão
php artisan horizon:status   # Estado atual
php artisan horizon:pause    # Pausa processamento
php artisan horizon:continue # Retoma
```

Filas configuradas:
- `default` — uploads, processing, analytics
- `notifications` — envio de notificações (listeners com `$queue = 'notifications'`)

---

## Autorização

Policies registradas em `AppServiceProvider` via `Gate::policy()`:
- `VideoPolicy` — `create`, `view`, `update`, `delete`, `publish`, `retryTranscription`, `manageSuggestion`
- `PlaylistPolicy` — `view`, `update`, `delete`, `addVideo`, `removeVideo`, `reorderVideos`
- `CommentPolicy` — `update`, `delete`, `viewVersions`

Esta lista de abilities muda — confira `public function` nas três classes em
`backend/app/Policies/` para a atual.

Controllers chamam `$this->authorize('ação', $model)` antes de qualquer mutação que exige ownership.

---

## Transcrição e IA — Pipeline

Após o vídeo ser publicado pelo `ProcessVideoUpload`, o pipeline de IA inicia automaticamente:

```
ProcessVideoUpload → dispara VideoPublished
                                  ↓
                          TranscribeVideo (job, via TranscribeVideoListener)
                          → POST ao serviço whisper com video_url
                          → cria Transcription (status=PROCESSING)
                          → dispara VideoTranscriptionStarted (notificação + broadcast)
                          → ao concluir: Transcription status=COMPLETED
                          → dispara VideoTranscriptionCompleted (notificação + broadcast)
                          → dispatch GenerateAiMetadata
                                  ↓
                          GenerateAiMetadata (job)
                          → AiClient::generateContent() — implementação ativa é GroqClient
                            (app/AI/Clients/GroqClient.php); trocar de provider é bindar outra
                            implementação de AiClient em AppServiceProvider, não editar o job
                          → cria/atualiza VideoAiSuggestion (status=PENDING)
                          → dispara AiSuggestionReady (broadcast)
```

O usuário aceita ou dispensa a sugestão via:
- `POST /api/videos/{vuid}/ai-suggestion/accept` — aplica title/description/tags ao vídeo
- `POST /api/videos/{vuid}/ai-suggestion/dismiss` — marca como dismissed (status=DISMISSED)

Variáveis de ambiente necessárias: ver seção "Variáveis de ambiente relevantes" abaixo
(`WHISPER_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_URL`) — não há mais `GEMINI_*`, o provider de IA
padrão é Groq via `AiClient`/`GroqClient`.

---

## Variáveis de ambiente relevantes

```env
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=local          # uploads temporários (privado)
FILESYSTEM_DISK_PUBLIC=public  # arquivos servidos pelo Caddy

TUS_MAX_UPLOAD_BYTES=2147483648  # 2 GB (opcional — padrão é App\Config\UploadLimits::VIDEO_MAX_BYTES, o mesmo teto do upload direto)

# IA / Transcrição
WHISPER_URL=http://whisper:9000  # serviço whisper-asr no docker-compose
AI_API_KEY=...                   # chave da API do provider (Groq por padrão)
AI_MODEL=llama-3.3-70b-versatile
AI_URL=https://api.groq.com/openai/v1

# Monitoramento (OpenTelemetry → New Relic)
OTEL_PHP_AUTOLOAD_ENABLED=true
OTEL_SERVICE_NAME=MeTube
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS=api-key=YOUR_LICENSE_KEY   # deixar vazio desativa o envio
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Reverb (WebSockets)
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_HOST=reverb             # nome do serviço no docker-compose
REVERB_PORT=8080

# Testes (phpunit.xml)
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
CACHE_STORE=array
SESSION_DRIVER=array
QUEUE_CONNECTION=sync
```
