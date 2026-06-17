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

```
app/
  Console/Commands/
    PublishScheduledVideos.php      # Agendador: publica vídeos com scheduled_at vencido

  Contracts/
    LoggableUserEvent.php           # Interface para eventos que o LogUserAnalytic persiste
    StorageContract.php             # Abstrai todas as ops de disco (temp + public); implementado por StorageService

  Data/                             # DTOs tipados — criados a partir de $request->validated()
    CreateVideoData.php
    FinalizeUploadData.php          # Para o fluxo de upload resumável (tus)
    UpdateVideoData.php
    EmptyVideoSummary.php           # Retornado quando o vídeo ainda não tem summary

  Enums/
    HistoryPeriod.php               # today | week | month | all
    NotificationType.php            # comment_replied | comment_liked | video_liked | new_subscriber | video_from_subscription
    PlaylistName.php                # Watch Later (nome reservado, auto-criado no boot)
    ReactionType.php                # like | dislike
    VideoEventType.php              # view, like, dislike, save, finish, skip, ... (sinais para analytics)
    VideoStatus.php                 # published | scheduled | processing | draft | failed

  Events/                           # Disparados por services; ouvidos por listeners
    ChannelSubscribed.php / ChannelUnsubscribed.php
    CommentCreated.php / CommentLiked.php
    SearchPerformed.php
    VideoClickedFromFeed.php / VideoFinished.php / VideoImpressed.php / VideoImpressionsBatch.php
    VideoLiked.php / VideoPublished.php / VideoReactionApplied.php
    VideoSaved.php / VideoSkipped.php / VideoStatusUpdated.php
    VideoUndisliked.php / VideoUnliked.php / VideoUnsaved.php / VideoViewed.php

  Exceptions/
    InvalidCredentialsException.php # 401 renderizado em bootstrap/app.php

  Http/
    Controllers/                    # Thin: parse input → authorize → service → resource
      AnalyticsController.php
      AuthController.php
      ChannelController.php
      CommentController.php
      Controller.php                # Base: json(), noContent(), AuthorizesRequests
      NotificationsController.php
      PlaylistController.php
      TusController.php             # Proxy tus-php: lida com todos os verbos do protocolo tus
      UserController.php
      VideoController.php

    Middleware/
      CheckSessionVersion.php       # Alias session.version — valida session_version vs DB

    Requests/
      Analytics/                    # LogClickRequest, LogImpressionsRequest, LogSearchRequest, LogSkipRequest
      Auth/                         # LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, UpdateProfileRequest
      Comment/                      # StoreCommentRequest, UpdateCommentRequest
      Playlist/                     # AddVideoRequest, ReorderVideosRequest, StorePlaylistRequest, UpdatePlaylistRequest
      Video/
        StoreVideoRequest.php       # Aceita upload_key (tus) OU video_file (direto); verifica owner
        UpdateProgressRequest.php
        UpdateVideoRequest.php

    Resources/                      # JsonResource — nunca retorne models crus
      CommentResource.php
      CommentVersionResource.php
      NotificationResource.php
      PlaylistResource.php
      TranscriptionResource.php
      UserResource.php
      VideoAiSuggestionResource.php
      VideoResource.php
      WatchHistoryResource.php

  Jobs/
    GenerateAiMetadata.php          # Chama GeminiService para gerar title/description/tags; dispara AiSuggestionReady
    NotifySubscribersChunk.php      # Envia VideoFromSubscriptionNotification para um chunk de inscritos
    ProcessVideoUpload.php          # Async: move tmp→public, calcula status, dispara eventos
    TranscribeVideo.php             # Chama Whisper via HTTP; ao concluir dispara GenerateAiMetadata

  Listeners/
    InvalidateCacheSubscriber.php   # Invalida cache para eventos de subscribe/unsubscribe e watch history (operações DB raw)
    LogImpressionsBatch.php         # Bulk-insere impressões em user_analytics
    LogUserAnalytic.php             # Persiste qualquer evento loggable em user_analytics
    SendCommentLikedNotification.php
    SendCommentRepliedNotification.php
    SendNewSubscriberNotification.php
    SendVideoLikedNotification.php
    SendVideoProcessedNotification.php   # Ouve VideoStatusUpdated; notifica quando published ou failed
    SendVideoPublishedNotifications.php  # Dispara NotifySubscribersChunk em chunks de 50
    SendVideoTranscribedNotification.php # Ouve TranscriptionStatusUpdated; notifica PROCESSING e COMPLETED

  Models/
    Comment.php                     # cuid, content, likes_count, replies_count, current_version_id
    CommentVersion.php              # Histórico de edições de comentários
    Playlist.php                    # puid; videos() → BelongsToMany ordenado por position
    PlaylistVideo.php               # Pivot: playlist_id, video_id, position
    Transcription.php               # status (TranscriptionStatus), language, content, started_at
    User.php                        # uuid; boot cria playlist "Watch Later" para todo user novo
    UserAnalytic.php                # Registro de eventos analytics do usuário
    UserSubscription.php            # Pivot: user_id → channel_id
    UserVideoReaction.php           # Pivot: user_id, video_id, type (like|dislike)
    Video.php                       # vuid; usa VideoBuilder (newEloquentBuilder)
    Builders/                        # Custom Eloquent Builders — um por model com query logic
      VideoBuilder.php               # filter, published, newestPublished, scheduledDue, byVuid
      CommentBuilder.php, ...        # toda query reaproveitável vive aqui (não em scopes)
    VideoAiSuggestion.php           # status (AiSuggestionStatus), suggested_title/description/tags
    VideoProgress.php               # user_id, video_id, percent (0-100)
    VideoSummary.php                # keyPoints, chapters, readingMode (gerado por IA)
    WatchHistory.php                # user_id, video_id, watched_at, watched_hour (GENERATED)

  Observers/                        # Invalidação de cache reativa via Eloquent events
    PlaylistObserver.php            # Invalida cache de playlists do usuário ao criar/atualizar/deletar
    UserObserver.php                # Invalida cache do usuário ao atualizar perfil
    VideoObserver.php               # Invalida cache de feed/canal/vídeo ao publicar/atualizar/deletar

  Notifications/
    CommentLikedNotification.php
    CommentRepliedNotification.php
    NewSubscriberNotification.php
    ResetPasswordNotification.php   # Envia link para o frontend SPA, não para /password/reset do Laravel
    VideoFromSubscriptionNotification.php
    VideoLikedNotification.php
    VideoProcessedNotification.php  # Notifica dono quando vídeo termina de processar (published ou failed)
    VideoTranscribedNotification.php         # Notifica dono quando transcrição conclui com sucesso
    VideoTranscriptionStartedNotification.php # Notifica dono quando transcrição começa (inclui ETA)

  Policies/
    CommentPolicy.php
    PlaylistPolicy.php
    VideoPolicy.php

  Providers/
    AppServiceProvider.php          # Rate limiters, Gate::policy(), Event::listen()

  Services/
    AnalyticsService.php            # recordImpressions, recordClick, recordSearch, recordSkip
    AuthService.php                 # login, logout, me, register, updateProfile, resetPassword
    CacheService.php                # Wrapper tipado para todos os grupos de cache da aplicação (ver seção Cache abaixo)
    ChannelService.php              # show, videos, toggleSubscription
    CommentService.php              # list, store, update, destroy, toggleLike, replies, versions
    GeminiService.php               # Thin wrapper do Gemini REST API; generateContent com responseMimeType=application/json
    PlaylistService.php             # CRUD, addVideo, removeVideo, reorderVideos
    RecommendationService.php       # forUser(user, page): scoring server-side por tags + eventos do usuário + cache
    ThumbnailService.php            # redimensiona e salva thumbnail
    UserService.php                 # getUserLikes, getUserSaved, getUserSubscriptions, getUserHistory, getUserProgress
    VideoService.php                # CRUD, finalizeUpload (tus), toggleLike/Dislike/Save, updateProgress
    VideoStorageService.php         # publishVideo, publishThumbnail, cleanupTmp
    ViewCounterService.php          # Contador de views bufferizado no Redis; flushes periódicos via artisan

config/
  tus.php                           # upload_dir, ttl, max_size, api_path

routes/
  api.php                           # Todas as rotas REST da API
  channels.php                      # Canais Reverb: users.{uuid} (privado), videos.{vuid} (público)
```

---

## API Routes

Todas as rotas da API estão prefixadas em `/api` via `bootstrap/app.php`.
Organizadas em `Route::prefix(...)->group(...)`. Throttles usam named rate limiters do `AppServiceProvider`.

### Públicas

```
POST   /api/sessions                        AuthController::login          throttle:login
POST   /api/users                           AuthController::register
POST   /api/password-resets                 AuthController::forgotPassword throttle:password-reset
PATCH  /api/password-resets/{token}         AuthController::resetPassword  throttle:password-reset
```

### Protegidas (auth:sanctum + session.version)

```
GET    /api/sessions/current                AuthController::me
DELETE /api/sessions/current                AuthController::logout

PATCH  /api/users/{uuid}                    AuthController::updateProfile
GET    /api/users/me/likes                  UserController::likes
GET    /api/users/me/saved                  UserController::saved
GET    /api/users/me/subscriptions          UserController::subscriptions
GET    /api/users/me/progress               UserController::progress
GET    /api/users/me/history                UserController::history          ?period={today|week|month|all}
GET    /api/users/me/history/events         UserController::historyEvents
DELETE /api/users/me/history                UserController::clearHistory     → 204
DELETE /api/users/me/history/{vuid}         UserController::removeHistory    → 204

GET    /api/email-verifications/{id}/{hash} AuthController::verifyEmail      signed + throttle:email-verification
POST   /api/email-verifications             AuthController::resendVerification throttle:email-verification

ANY    /api/uploads/tus{suffix?}            TusController::handle            CSRF isento

GET    /api/videos/recommendations           VideoController::recommendations ?page
GET    /api/videos                          VideoController::index           ?page, search, tags[], status
POST   /api/videos                          VideoController::store           → 202 Accepted
GET    /api/videos/{vuid}                   VideoController::show
PATCH  /api/videos/{vuid}                   VideoController::update
DELETE /api/videos/{vuid}                   VideoController::destroy         → 204
POST   /api/videos/{vuid}/views             VideoController::recordView      → 204
POST   /api/videos/{vuid}/like              VideoController::toggleLike      → 204
POST   /api/videos/{vuid}/dislike           VideoController::toggleDislike   → 204
POST   /api/videos/{vuid}/save              VideoController::toggleSave      → 204
PUT    /api/videos/{vuid}/progress          VideoController::updateProgress  → 204
GET    /api/videos/{vuid}/summary           VideoController::summary
GET    /api/videos/{vuid}/transcription     VideoController::transcription
POST   /api/videos/{vuid}/transcription/retry VideoController::retryTranscription
GET    /api/videos/{vuid}/ai-suggestion     VideoController::aiSuggestion
POST   /api/videos/{vuid}/ai-suggestion/accept   VideoController::acceptSuggestion
POST   /api/videos/{vuid}/ai-suggestion/dismiss  VideoController::dismissSuggestion
GET    /api/videos/{vuid}/comments          CommentController::index         ?page
POST   /api/videos/{vuid}/comments          CommentController::store

PATCH  /api/comments/{cuid}                 CommentController::update
DELETE /api/comments/{cuid}                 CommentController::destroy       → 204
POST   /api/comments/{cuid}/like            CommentController::toggleLike
GET    /api/comments/{cuid}/replies         CommentController::replies
GET    /api/comments/{cuid}/versions        CommentController::versions

GET    /api/channels/{uuid}                 ChannelController::show
GET    /api/channels/{uuid}/videos          ChannelController::videos
POST   /api/channels/{uuid}/subscription    ChannelController::toggleSubscription → 204

GET    /api/playlists                       PlaylistController::index
POST   /api/playlists                       PlaylistController::store        → 201
GET    /api/playlists/{puid}                PlaylistController::show
PATCH  /api/playlists/{puid}                PlaylistController::update
DELETE /api/playlists/{puid}                PlaylistController::destroy      → 204
GET    /api/playlists/{puid}/videos         PlaylistController::listVideos
POST   /api/playlists/{puid}/videos         PlaylistController::addVideo
PUT    /api/playlists/{puid}/videos         PlaylistController::reorderVideos
DELETE /api/playlists/{puid}/videos/{vuid}  PlaylistController::removeVideo  → 204

GET    /api/notifications                   NotificationsController::index
GET    /api/notifications/unread-count      NotificationsController::unreadCount
POST   /api/notifications/read-all          NotificationsController::readAll
POST   /api/notifications/{id}/read         NotificationsController::markRead
DELETE /api/notifications/{id}              NotificationsController::destroy → 204

POST   /api/analytics/impressions           AnalyticsController::impressions
POST   /api/analytics/clicks                AnalyticsController::click
POST   /api/analytics/searches              AnalyticsController::search
POST   /api/analytics/skips                 AnalyticsController::skip
```

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

Todos os controllers usam JsonResource. **Nunca retorne models crus.**

### VideoResource
```php
[
    'vuid'          => $this->vuid,
    'title'         => $this->title,
    'description'   => $this->description ?? '',
    'status'        => $this->status->value,
    'views'         => $this->views,
    'duration'      => $this->duration,
    'video_url'     => app(StorageContract::class)->publicUrl($this->video_url),  // null-safe
    'thumbnail_url' => app(StorageContract::class)->publicUrl($this->thumbnail_url),
    'published_at'  => $this->published_at?->toIso8601String(),
    'scheduled_at'  => $this->scheduled_at?->toIso8601String(),
    'created_at'    => $this->created_at->toIso8601String(),
    'tags'          => $this->tags ?? [],
    'captions'      => $this->captions ?? [],
    'channel'       => $this->whenLoaded('channel', fn () => $this->channel->name, ''),
    'channel_id'    => $this->whenLoaded('channel', fn () => $this->channel->uuid, ''),
]
```

### UserResource
```php
[
    'uuid'              => $this->uuid,
    'name'              => $this->name,
    'email'             => $this->email,
    'bio'               => $this->bio,
    'avatar'            => $this->avatar,
    'email_verified_at' => $this->email_verified_at?->toIso8601String(),
    'created_at'        => $this->created_at?->toIso8601String(),
]
```

### PlaylistResource
```php
[
    'puid'       => $this->puid,
    'name'       => $this->name,
    'video_ids'  => $this->whenLoaded('videos', fn () => $this->videos->map(fn ($v) => $v->vuid)->values()->toArray(), []),
    'created_at' => $this->created_at?->toIso8601String(),
]
```

### CommentResource
```php
[
    'cuid'          => $this->cuid,
    'content'       => $this->content,
    'likes_count'   => $this->likes_count ?? 0,
    'replies_count' => $this->replies_count ?? 0,
    'is_liked'      => $this->is_liked ?? false,         // virtual, injetado pelo service
    'is_edited'     => $this->current_version_id !== null,
    'parent_cuid'   => $this->whenLoaded('parent', fn () => $this->parent?->cuid, null),
    'created_at'    => $this->created_at->toIso8601String(),
    'author'        => $this->whenLoaded('user', fn () => ['uuid', 'name', 'avatar']),
]
```

### NotificationResource
```php
[
    'id'         => $this->id,
    'type'       => $this->data['type'] ?? null,
    'data'       => $this->data,
    'read_at'    => $this->read_at?->toISOString(),
    'created_at' => $this->created_at->toISOString(),
]
```

### WatchHistoryResource
```php
[
    'vuid'       => $this->video->vuid,
    'watched_at' => $this->watched_at->toIso8601String(),
]
```

### TranscriptionResource
```php
[
    'status'            => $this->status->value,         // pending | processing | completed | failed
    'language'          => $this->language,
    'content'           => $this->status === COMPLETED ? $this->content : null,
    'started_at'        => $isProcessing ? $this->started_at?->toIso8601String() : null,
    'estimated_seconds' => $isProcessing ? $this->estimatedSeconds() : null,  // derivado da duração do vídeo
]
```

### VideoAiSuggestionResource
```php
[
    'status'                  => $this->status->value,  // pending | accepted | dismissed
    'suggested_title'         => $this->suggested_title,
    'suggested_description'   => $this->suggested_description,
    'suggested_tags'          => $this->suggested_tags,
]
```

Coleções paginadas: `VideoResource::collection($paginator)` → envelope `{data: [...], links: {...}, meta: {...}}`.

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
Campos `published_at`, `scheduled_at` são cast para `Carbon`. Use `->isFuture()` diretamente — nunca `?->isFuture()` (retornaria `bool|null`, quebrando PHPStan).

### Comment — `is_liked` virtual
Não é coluna. O service injeta `is_liked` como atributo virtual via `setRelation` ou `setAttribute`
após resolver os likes do usuário em bulk para evitar N+1.

### WatchHistory — `watched_hour`
No PostgreSQL é uma coluna `GENERATED ALWAYS AS` (hora truncada). Em SQLite (testes) é coluna plain.
Nunca defina `watched_hour` manualmente no PostgreSQL; nos testes, defina para que o `insertOrIgnore` funcione.

---

## Enums

| Enum                  | Valores                                                                        |
|-----------------------|--------------------------------------------------------------------------------|
| `VideoStatus`         | `published`, `scheduled`, `processing`, `draft`, `failed`                     |
| `TranscriptionStatus` | `pending`, `processing`, `completed`, `failed`                                 |
| `AiSuggestionStatus`  | `pending`, `accepted`, `dismissed`                                             |
| `ReactionType`        | `like`, `dislike`                                                              |
| `VideoEventType`      | `view`, `like`, `dislike`, `save`, `finish`, `skip`, `unlike`, `undislike`, `unsave`, `impression`, `click`, `subscribe`, `unsubscribe`, `search` |
| `VideoSource`         | `feed`, `search`, `channel`, `playlist`, `recommended`, `home`                 |
| `NotificationType`    | `comment_replied`, `comment_liked`, `video_liked`, `new_subscriber`, `video_from_subscription` |
| `PlaylistName`        | `Watch Later`                                                                  |
| `HistoryPeriod`       | `today`, `week`, `month`, `all`                                                |

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

| Service                | Responsabilidade                                                             |
|------------------------|------------------------------------------------------------------------------|
| `AuthService`          | login, logout, me, register, updateProfile, sendPasswordResetLink, resetPassword |
| `VideoService`         | CRUD, finalizeUpload (tus), toggleLike/Dislike/Save, updateProgress, getSummary, transcription, AI suggestion |
| `StorageService`       | Única classe que chama `Storage::disk()`. Implementa `StorageContract`. Troca por S3 = mudar o binding em `AppServiceProvider` |
| `VideoStorageService`  | publishVideo, publishThumbnail, publishCaption, cleanupTmp. Injeta `StorageContract` |
| `ThumbnailService`     | redimensiona e salva thumbnail                                               |
| `ChannelService`       | show, videos, toggleSubscription                                             |
| `PlaylistService`      | CRUD, addVideo, removeVideo, reorderVideos                                   |
| `UserService`          | getUserLikes, getUserSaved, getUserSubscriptions, getUserHistory, getUserProgress |
| `CommentService`       | list, store, update, destroy, toggleLike, replies, versions                  |
| `AnalyticsService`     | recordImpressions, recordClick, recordSearch, recordSkip                     |
| `RecommendationService`| forUser(user, page) — scoring por tags + eventos; resultado em cache         |
| `CacheService`         | Wrapper tipado com grupos TTL configuráveis (ver seção Cache)                |
| `GeminiService`        | generateContent com JSON estruturado via Gemini REST API                     |
| `ViewCounterService`   | INCR Redis + flush periódico para evitar lock em `views` de vídeos virais    |

---

## Upload de vídeo — Fluxo assíncrono

### Modo 1: Upload direto (multipart/form-data)

```
POST /api/videos { video_file, thumbnail_file?, title, ... }
  → VideoService::createVideo()
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
     → StoreVideoRequest — valida owner via Cache::get("tus:owner:{key}")
     → VideoController::store() → detecta $request->has('upload_key')
     → VideoService::finalizeUpload()
        → TusRedisStore (prefixo tus:server:) — busca metadata do arquivo
        → move arquivo de uploads/tus/ para uploads/tmp/{vuid}.ext
        → cria Video com status=PROCESSING
        → dispatch ProcessVideoUpload
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

| Chave        | Valor padrão                      | Descrição                                     |
|--------------|-----------------------------------|-----------------------------------------------|
| `upload_dir` | `storage_path('app/uploads/tus')` | Onde os chunks são montados durante o upload  |
| `ttl`        | `21600` (6h)                      | TTL do Cache owner no Laravel                 |
| `max_size`   | `5 GB` (via `TUS_MAX_UPLOAD_BYTES`)| Limite por upload                            |
| `api_path`   | `/api/uploads/tus`                | Deve bater com a rota em api.php              |

### Gotcha — prefixo do TusRedisStore

O `TusServer` define o prefixo Redis via reflection: `'tus:' + strtolower(ShortName) + ':'` → **`tus:server:`**.

Ao instanciar `TusRedisStore` manualmente (ex: em `VideoService`), o prefixo padrão é `tus:`.
**Sempre chame `setPrefix('tus:server:')` antes de usar `get()`/`delete()`**:

```php
$tusCache = new TusRedisStore;
$tusCache->setPrefix('tus:server:');
$fileMeta = $tusCache->get($uploadKey);
```

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

Registrados em `AppServiceProvider::boot()`.

### Eventos loggáveis (→ `LogUserAnalytic`)
`VideoViewed`, `VideoReactionApplied`, `VideoSaved`, `VideoFinished`, `VideoSkipped`,
`VideoUnliked`, `VideoUndisliked`, `VideoUnsaved`, `VideoImpressed`, `VideoClickedFromFeed`,
`ChannelSubscribed`, `ChannelUnsubscribed`, `SearchPerformed`

### Eventos com notificações / outros listeners
| Evento                      | Listener(s)                                                      |
|-----------------------------|------------------------------------------------------------------|
| `VideoImpressionsBatch`     | `LogImpressionsBatch` (bulk-insert)                              |
| `CommentCreated`            | `SendCommentRepliedNotification`                                 |
| `CommentLiked`              | `SendCommentLikedNotification`                                   |
| `VideoLiked`                | `SendVideoLikedNotification`                                     |
| `ChannelSubscribed`         | `SendNewSubscriberNotification`, `InvalidateCacheSubscriber`     |
| `ChannelUnsubscribed`       | `InvalidateCacheSubscriber`                                      |
| `VideoPublished`            | `SendVideoPublishedNotifications` (chunks de 50 inscritos)       |
| `VideoStatusUpdated`        | `SendVideoProcessedNotification`                                 |
| `TranscriptionStatusUpdated`| `SendVideoTranscribedNotification`                               |
| `VideoViewed`               | `InvalidateCacheSubscriber`                                      |

### Broadcasting (Reverb)
Canais definidos em `routes/channels.php`:

| Canal             | Tipo    | Autorização                        |
|-------------------|---------|------------------------------------|
| `users.{uuid}`    | Privado | `$user->uuid === $uuid`            |
| `videos.{vuid}`   | Público | sempre `true`                      |

Eventos broadcast em `videos.{vuid}`:
- `VideoStatusUpdated` — status do processamento de vídeo
- `TranscriptionStatusUpdated` — progresso da transcrição (PROCESSING + ETA, COMPLETED, FAILED)
- `AiSuggestionReady` — sugestão de IA gerada e pronta para revisão

---

## Cache

Toda operação de cache passa pelo `CacheService` — nunca use `Cache::remember` diretamente nos services/controllers. Cada grupo tem TTL e flag `active` configurados em `config/cache.php` (`vidsum.*`):

| Grupo              | Tag(s)                  | Invalidado por                              |
|--------------------|-------------------------|---------------------------------------------|
| `feed`             | `feed`                  | `VideoObserver` (published/updated/deleted) |
| `channel:{uuid}`   | `channel:{uuid}`        | `VideoObserver`, `InvalidateCacheSubscriber`|
| `video:{vuid}`     | `video:{vuid}`          | `VideoObserver`                             |
| `user:{id}`        | `user:{id}`             | `UserObserver`, `PlaylistObserver`, `InvalidateCacheSubscriber` |
| `recommendations`  | `recommendations:{id}`  | `VideoObserver` (invalidated on feed changes)|

Cache de views usa Redis diretamente via `ViewCounterService`:
- `INCR vidsum:views:pending:{id}` em cada visualização
- `SADD vidsum:views:dirty {id}` para marcar vídeos sujos
- Flush periódico: `php artisan views:flush` via scheduled command

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
- `VideoPolicy` — `view`, `update`, `delete`
- `PlaylistPolicy` — `view`, `update`, `delete`, `addVideo`, `removeVideo`, `reorderVideos`
- `CommentPolicy` — `update`, `delete`

Controllers chamam `$this->authorize('ação', $model)` antes de qualquer mutação que exige ownership.

---

## Transcrição e IA — Pipeline

Após o vídeo ser publicado pelo `ProcessVideoUpload`, o pipeline de IA inicia automaticamente:

```
ProcessVideoUpload → dispara VideoPublished
                                  ↓
                          TranscribeVideo (job)
                          → POST /whisper com video_url
                          → cria Transcription (status=PROCESSING)
                          → dispara TranscriptionStatusUpdated (broadcast)
                          → ao concluir: Transcription status=COMPLETED
                          → dispara TranscriptionStatusUpdated (broadcast)
                          → dispatch GenerateAiMetadata
                                  ↓
                          GenerateAiMetadata (job)
                          → GeminiService.generateContent(prompt com transcrição)
                          → cria/atualiza VideoAiSuggestion (status=PENDING)
                          → dispara AiSuggestionReady (broadcast)
```

O usuário aceita ou dispensa a sugestão via:
- `POST /api/videos/{vuid}/ai-suggestion/accept` — aplica title/description/tags ao vídeo
- `POST /api/videos/{vuid}/ai-suggestion/dismiss` — marca como dismissed (status=DISMISSED)

Variáveis de ambiente necessárias:
```env
WHISPER_URL=http://whisper:9000  # serviço whisper-asr no docker-compose
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

---

## Variáveis de ambiente relevantes

```env
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=local          # uploads temporários (privado)
FILESYSTEM_DISK_PUBLIC=public  # arquivos servidos pelo nginx

TUS_MAX_UPLOAD_BYTES=5368709120  # 5 GB (opcional — padrão no config/tus.php)

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
