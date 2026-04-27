# Backend — Guia Completo

Stack: **Laravel 12 + FrankenPHP/Octane + PostgreSQL 16 + Redis 7**

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

---

## Estrutura de diretórios

```
app/
  Http/
    Controllers/         # Thin controllers — parse input, authorize, call service, format response
      AuthController.php
      ChannelController.php
      PlaylistController.php
      UserController.php
      VideoController.php
    Requests/            # FormRequests com validação e authorize()
      Auth/
      Playlist/
      Video/
    Resources/           # JsonResource — formata resposta da API
      PlaylistResource.php
      UserResource.php
      VideoResource.php
  Jobs/
    ProcessVideoUpload.php   # Async: move arquivo tmp → public, atualiza status
  Models/
    Playlist.php
    User.php
    Video.php
  Services/              # Business logic — nunca chame Eloquent direto no controller
    AuthService.php
    ChannelService.php
    PlaylistService.php
    ThumbnailService.php
    UserService.php
    VideoService.php
    VideoStorageService.php
  Enums/
    VideoStatus.php      # published | scheduled | processing | draft | failed
    ReactionType.php
    HistoryPeriod.php
  Exceptions/
    InvalidCredentialsException.php
  Policies/
    PlaylistPolicy.php
    VideoPolicy.php

routes/
  api.php               # Todas as rotas da API

tests/
  Feature/
    Auth/LoginTest.php
    Http/Controllers/    # Teste HTTP por controller
  Unit/
    Enums/
    Models/
    Services/
    Jobs/
```

---

## API Routes

Todas as rotas da API estão prefixadas em `/api` via `bootstrap/app.php`.

### Públicas

```
POST /api/auth/login    throttle:5/min    AuthController::login
```

### Protegidas (auth:sanctum + session.version)

```
POST   /api/auth/logout                   AuthController::logout
GET    /api/auth/me                       AuthController::me
PATCH  /api/auth/me                       AuthController::updateProfile

GET    /api/videos                        VideoController::index
POST   /api/videos                        VideoController::store          → 202 Accepted
GET    /api/videos/{vuid}                 VideoController::show
PATCH  /api/videos/{vuid}                 VideoController::update
DELETE /api/videos/{vuid}                 VideoController::destroy        → 204
POST   /api/videos/{vuid}/views           VideoController::recordView     → 204
POST   /api/videos/{vuid}/like            VideoController::toggleLike     → 204
POST   /api/videos/{vuid}/dislike         VideoController::toggleDislike  → 204
POST   /api/videos/{vuid}/save            VideoController::toggleSave     → 204
PUT    /api/videos/{vuid}/progress        VideoController::updateProgress → 204
GET    /api/videos/{vuid}/summary         VideoController::summary

GET    /api/users/me/likes                UserController::likes
GET    /api/users/me/saved                UserController::saved
GET    /api/users/me/subscriptions        UserController::subscriptions
GET    /api/users/me/history              UserController::history
GET    /api/users/me/history/events       UserController::historyEvents
DELETE /api/users/me/history              UserController::clearHistory    → 204
DELETE /api/users/me/history/{vuid}       UserController::removeHistory   → 204

GET    /api/channels/{uuid}               ChannelController::show
GET    /api/channels/{uuid}/videos        ChannelController::videos
POST   /api/channels/{uuid}/subscription  ChannelController::toggleSubscription → 204

GET    /api/playlists                     PlaylistController::index
POST   /api/playlists                     PlaylistController::store       → 201
GET    /api/playlists/{puid}              PlaylistController::show
PATCH  /api/playlists/{puid}              PlaylistController::update
DELETE /api/playlists/{puid}              PlaylistController::destroy     → 204
POST   /api/playlists/{puid}/videos       PlaylistController::addVideo
DELETE /api/playlists/{puid}/videos/{vuid} PlaylistController::removeVideo → 204
PUT    /api/playlists/{puid}/videos       PlaylistController::reorderVideos
```

---

## Identificadores

| Modelo    | Campo | Tipo                  | Geração                 |
|-----------|-------|-----------------------|-------------------------|
| User      | `uuid` | UUID v4              | `Str::uuid()` no boot() |
| Video     | `vuid` | string 11 chars       | `Str::random(11)` no boot() |
| Playlist  | `puid` | string 11 chars       | `Str::random(11)` no boot() |

- Nunca use `id` inteiro nas URLs — use sempre o identifier público.
- Requests que recebem vuid usam `exists:videos,vuid` (não `'uuid'` — vuid NÃO é UUID v4).

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
    'video_url'     => $this->video_url,
    'thumbnail_url' => $this->thumbnail_url,
    'published_at'  => $this->published_at?->toIso8601String(),
    'scheduled_at'  => $this->scheduled_at?->toIso8601String(),
    'tags'          => $this->tags ?? [],
    'channel'       => $this->whenLoaded('channel', fn () => $this->channel->name, ''),
    'channel_id'    => $this->whenLoaded('channel', fn () => $this->channel->uuid, ''),
]
```

### UserResource
```php
[
    'uuid'  => $this->uuid,
    'name'  => $this->name,
    'email' => $this->email,
    'bio'   => $this->bio,
    // ...
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

Coleções paginadas: `VideoResource::collection($paginator)` → envelope `{data: [...], links: {...}, meta: {...}}`.

---

## Middleware

- `auth:sanctum` — autenticação via Sanctum (cookie de sessão, sem JWT)
- `session.version` — valida `session_version` do usuário; força logout se divergente
- `throttle:login` — 5 tentativas/min por IP na rota de login

---

## Modelos — Convenções

### Boot auto-create
`User::boot()` cria automaticamente uma playlist "Watch Later" para todo usuário novo.
Impacto nos testes: `User::factory()->create()` → banco já tem 1 playlist. Ajuste contagens.

### Enum VideoStatus
Valores: `published | scheduled | processing | draft | failed`
- `isPublic()` → true apenas para `PUBLISHED`
- `values()` → array com todos os valores

### Carbon nos modelos
Campos `published_at`, `scheduled_at` são cast para `Carbon`. Use `->isFuture()` diretamente, não `?->isFuture()` (retornaria `bool|null`, quebrando PHPStan).

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
- Elvis operator `?:` proibido (PHPStan `ternary.shortNotAllowed`). Use `!== null ? ... : ...`.
- `readStream()` retorna `resource|null` — faça null-guard antes de passar para `put()`.
- Scopes que chamam métodos que retornam `Builder` e depois retornam `$query`: descarte o retorno intermediário.

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
- RefreshDatabase em cada arquivo Feature

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

| Service               | Responsabilidade                                          |
|-----------------------|-----------------------------------------------------------|
| `AuthService`         | login, logout, me, updateProfile                         |
| `VideoService`        | CRUD de vídeo, toggleLike/Dislike/Save, updateProgress   |
| `VideoStorageService` | move arquivos tmp→public, publica thumbnail              |
| `ThumbnailService`    | redimensiona e salva thumbnail                           |
| `ChannelService`      | toggleSubscription                                        |
| `PlaylistService`     | CRUD de playlist, addVideo, removeVideo, reorderVideos   |
| `UserService`         | getUserLikes, getUserSaved, history                      |

---

## Upload de vídeo — Fluxo assíncrono

```
POST /api/videos (FormData)
  → VideoService::createVideo()
     → salva arquivo em uploads/tmp/{vuid}.ext (disco local, privado)
     → cria Video com status=PROCESSING
     → dispatch ProcessVideoUpload::dispatch($video, $tmpPath)
  → retorna 202 com VideoResource

ProcessVideoUpload::handle()
  → move arquivo tmp → storage/app/public/videos/{vuid}.ext
  → atualiza video_url, thumbnail_url
  → status = PUBLISHED (ou SCHEDULED se scheduled_at futuro)

ProcessVideoUpload::failed()
  → limpa arquivos tmp
  → status = FAILED
```

O worker é o serviço `queue` no docker-compose: `php artisan queue:work redis --tries=3 --timeout=3600`.

---

## Autorização

Policies: `VideoPolicy` e `PlaylistPolicy`. Registradas no `AppServiceProvider` via `Gate::policy()`.

Controllers chamam `$this->authorize('update', $playlist)` antes de mutações que exigem ownership.

---

## Variáveis de ambiente relevantes

```env
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=local          # uploads temporários
FILESYSTEM_DISK_PUBLIC=public  # arquivos servidos pelo nginx

# Testes (phpunit.xml)
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
CACHE_STORE=array
SESSION_DRIVER=array
QUEUE_CONNECTION=sync
```
