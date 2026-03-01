# Vidsum — Application Context

This document describes the architecture, conventions, and decisions made in this project.
It must be kept up-to-date and consulted before any new implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure](#infrastructure)
3. [Backend](#backend)
4. [Frontend](#frontend)
5. [Authentication](#authentication)
6. [Testing](#testing)
7. [Conventions & Rules](#conventions--rules)
8. [Code Preferences](#code-preferences)
9. [Running the Project](#running-the-project)

---

## Overview

**Vidsum** is a video platform similar to YouTube, where users can upload or embed videos and get automatic AI-powered processing: transcription, summarization, tag generation, and content classification.
The frontend is a React SPA; the backend is a Laravel 12 JSON API.
They are fully decoupled — the frontend communicates with the backend exclusively via REST API.

```
Browser → localhost:5173 (Vite dev server)
               │
               ├─ /api/* ─proxy→ nginx:80 → backend:8000 (Octane/FrankenPHP)
               │                                   │
               │                             postgres:5432
               │                             redis:6379
               │
localhost:80 (Nginx) → backend:8000   [also accessible directly]
```

---

## Infrastructure

### docker-compose.yml

| Service    | Image                   | Port         | Purpose                            |
|------------|-------------------------|--------------|------------------------------------|
| `postgres` | postgres:16             | 5432         | Primary database                   |
| `redis`    | redis:7-alpine          | 6379         | Sessions and cache                 |
| `backend`  | ./backend/Dockerfile    | 8000         | Laravel 12 (Octane/FrankenPHP)     |
| `frontend` | ./frontend/Dockerfile   | 5173         | React + Vite dev server            |
| `nginx`    | nginx:alpine            | 80           | Reverse proxy for the backend      |

All services share the `app_net` bridge network.
`postgres` and `redis` expose health-checks; `backend` waits for both before starting.

### Backend Dockerfile

Multi-stage build:
1. **Stage 1** (`composer:latest`) — installs PHP dependencies via `composer install --optimize-autoloader`.
2. **Stage 2** (`dunglas/frankenphp:latest`) — installs PHP extensions (`pdo_pgsql`, `pgsql`, `mbstring`, `pcntl`, `bcmath`, `sockets`, `opcache`, `ext-redis`), copies the app and runs `entrypoint.sh`.

**Important:** The volume `./backend:/app` maps the local backend directory into the container at runtime.
This means the local `vendor/` directory must exist (produced by `composer install` locally or by rebuilding the image).

### entrypoint.sh

On every container start:
1. Clears Laravel caches.
2. Waits for PostgreSQL to be ready (`pg_isready`).
3. Runs `php artisan migrate --force`.
4. Starts Octane with FrankenPHP on `0.0.0.0:8000`.

### Environment files

| File                        | Purpose                                                           |
|-----------------------------|-------------------------------------------------------------------|
| `.env` (root)               | Docker host port overrides (`BACKEND_PORT`, `FRONTEND_PORT`, etc.) |
| `.env.postgres`             | PostgreSQL container credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) |
| `backend/.env`              | Full Laravel config (copy from `backend/.env.example`)            |
| `backend/.env.example`      | Reference template — always keep up-to-date                       |

Key backend env variables:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=postgres          # docker service name
SESSION_DRIVER=redis      # Sanctum uses session-based auth; Redis is required
CACHE_STORE=redis
QUEUE_CONNECTION=database
REDIS_HOST=redis          # docker service name
REDIS_CLIENT=phpredis     # requires ext-redis PHP extension
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000,127.0.0.1:5173
FRONTEND_URL=http://localhost:5173
OCTANE_SERVER=frankenphp
```

---

## Backend

### Technology Stack

| Component     | Technology                          |
|---------------|-------------------------------------|
| Language      | PHP 8.2+                            |
| Framework     | Laravel 12                          |
| HTTP Server   | Laravel Octane + FrankenPHP         |
| Database      | PostgreSQL 16 via Eloquent ORM      |
| Auth          | Laravel Sanctum (session/cookie)    |
| Session       | Redis driver                        |
| Cache         | Redis                               |
| Queue         | Database driver                     |

### Directory Structure

```
backend/
├── app/
│   ├── Exceptions/
│   │   └── InvalidCredentialsException.php  ← typed exception → 401 JSON
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── AuthController.php           ← thin: calls service, returns response
│   │   ├── Requests/
│   │   │   └── Auth/
│   │   │       └── LoginRequest.php         ← all validation lives here
│   │   └── Resources/
│   │       └── UserResource.php             ← shapes the user JSON payload
│   ├── Models/
│   │   └── User.php                         ← business rules; has session_version column
│   ├── Providers/
│   │   └── AppServiceProvider.php
│   └── Services/
│       └── AuthService.php                  ← application logic
├── bootstrap/
│   └── app.php                              ← routing, middleware, exception handler
├── config/
│   └── ...
├── database/
│   ├── factories/
│   │   └── UserFactory.php                  ← default password: "password"
│   ├── migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php
│   │   ├── 0001_01_01_000002_create_jobs_table.php
│   │   └── 2026_02_28_171708_add_session_version_to_users_table.php
│   └── seeders/
├── lang/
│   └── en/
│       └── messages.php                     ← custom app strings (English base)
├── routes/
│   ├── api.php                              ← all API routes (prefixed /api)
│   └── web.php
└── tests/
    ├── Feature/
    │   └── Auth/
    │       └── LoginTest.php
    └── Unit/
```

### Architecture Rules (mandatory)

**Controllers must:**
- Accept a `FormRequest` (never validate manually).
- Call a single `Service` method.
- Return a JSON response using an API `Resource` where applicable.
- Contain **zero** business logic or application logic.

**Services must:**
- Contain all **application logic** (orchestrate calls to models, repos, external APIs).
- Throw typed exceptions (never return error codes directly).
- Be injected into controllers via constructor DI.

**Models must:**
- Contain all **business rules** (computed properties, domain checks).
- Never contain application logic or HTTP-related code.
- Use `$fillable` and `$hidden` explicitly.
- Use `casts()` for type coercion.

**FormRequests must:**
- Define `authorize()` and `rules()`.
- Never call services or models.

**API Resources must:**
- Define every field returned to the client explicitly.
- Never expose `password`, `remember_token`, or any internal fields.

### API Routes

Base path: `/api` (auto-prefixed by Laravel when registered via `api:` in `bootstrap/app.php`)

| Method | Path              | Middleware                        | Action                          |
|--------|-------------------|-----------------------------------|---------------------------------|
| POST   | `/api/auth/login` | `throttle:login`                  | Authenticate → starts session   |
| POST   | `/api/auth/logout`| `auth:sanctum`, `session.version` | Destroy session                 |
| GET    | `/api/auth/me`    | `auth:sanctum`, `session.version` | Return authenticated user       |

### Exception Handling

Custom exceptions are registered in `bootstrap/app.php → withExceptions()`:

| Exception                     | HTTP Status | Response                                          |
|-------------------------------|-------------|---------------------------------------------------|
| `InvalidCredentialsException` | 401         | `{ "message": "..." }`                           |
| `AuthenticationException`     | 401         | Default Laravel JSON response                     |
| `ValidationException`         | 422         | `{ "message": "...", "errors": { ... } }`        |

### Internationalization (Backend)

- Language files live in `lang/en/`.
- `lang/en/messages.php` — custom application strings.
- Always use `trans('messages.auth.logout_success')` — **never hardcode strings** in controllers or services.
- Base language: **English**.

---

## Frontend

### Technology Stack

| Component       | Technology                              |
|-----------------|-----------------------------------------|
| Language        | TypeScript 5.9 (strict mode)            |
| Framework       | React 19                                |
| Build tool      | Vite 7 (rolldown-vite)                  |
| Routing         | react-router-dom 7                      |
| HTTP Client     | axios 1.7 (`withCredentials: true`)     |
| i18n            | i18next 25 + react-i18next 15           |
| Linter          | ESLint 9 (flat config)                  |

### Directory Structure

```
frontend/src/
├── api/
│   ├── auth.ts              ← typed functions: login, logout, me
│   └── client.ts            ← axios instance + response interceptor (session-expired)
├── components/
│   ├── PreferencesPanel.tsx ← user preferences UI (theme, etc.)
│   ├── ProtectedRoute.tsx   ← redirects to /login if not authenticated
│   └── ui/                  ← reusable UI primitives (Button, Input, Modal, etc.)
├── context/
│   ├── AuthContext.tsx      ← global auth state (user, loading, sessionError)
│   └── ThemeContext.tsx     ← global theme state (dark/light mode)
├── i18n/
│   ├── index.ts             ← i18next initialization (imported in main.tsx)
│   └── locales/
│       └── en.json          ← all user-facing strings
├── pages/
│   ├── LoginPage.tsx        ← public route
│   └── DashboardPage.tsx    ← protected route
├── styles/
│   ├── base.css             ← CSS custom properties and global resets
│   └── animations.css       ← shared keyframe animations
├── App.tsx                  ← BrowserRouter + AuthProvider + ThemeProvider + Routes
├── index.css                ← global stylesheet entry point
└── main.tsx                 ← entry point (imports i18n before App)
```

### Code Style (enforced by ESLint)

- **4-space indent**, **single quotes**, **semicolons required**, **trailing commas**.
- `prefer-const`, `no-var`, strict equality.
- Max complexity: 8 | Max depth: 3.
- TypeScript: `noUnusedLocals`, `noUnusedParameters`, `strict: true`.
- Unused variables must be prefixed with `_`.

### Routing

| Path      | Component          | Guard            |
|-----------|--------------------|------------------|
| `/login`  | `LoginPage`        | Public           |
| `/`       | `DashboardPage`    | `ProtectedRoute` (requires auth) |

### API Communication

All requests go through `src/api/client.ts` (axios instance with `baseURL: '/api'` and `withCredentials: true`).
In development, Vite proxies `/api/*` to `http://backend:8000`.

**No token management** — auth is handled via session cookies (set by Sanctum on login).

**Response interceptor** — on `401` (outside `/auth/login`), dispatches `auth:session-expired` CustomEvent.

### Auth State (`AuthContext`)

```typescript
interface AuthContextValue {
    user: User | null
    loading: boolean            // true during initial hydration
    sessionError: string | null // populated when session expires
    signIn(email, password): Promise<void>
    signOut(): Promise<void>
}
```

On mount, `AuthContext` calls `GET /api/auth/me` to re-hydrate the user from the existing session cookie.
No token is stored in `localStorage`.

### Theme (`ThemeContext`)

Manages dark/light mode preference. Persisted across sessions (localStorage).
Accessible via `useTheme()` hook. `PreferencesPanel` is the UI for changing it.

### Internationalization (Frontend)

- All user-facing strings must use `const { t } = useTranslation()`.
- **Never hardcode strings** in component JSX or logic.
- Translation keys live in `src/i18n/locales/en.json`.
- Base language: **English**.
- `i18n/index.ts` is imported once in `main.tsx` before `App`.

---

## Authentication

### Flow (Sanctum session-based)

```
[Client]                          [Backend]
   │── POST /api/auth/login ──────────│
   │   { email, password }            │ LoginRequest validates
   │                                  │ AuthService::login() → Auth::attempt()
   │◄─ { user } + Set-Cookie          │ Session started, cookie returned
   │   (session cookie)               │
   │                                  │
   │── GET /api/auth/me ─────────────→│ auth:sanctum validates session cookie
   │   Cookie: laravel_session=...    │ AuthService::me()
   │◄─ { id, name, email, ... }      │
   │                                  │
   │── POST /api/auth/logout ────────→│ Session destroyed
   │◄─ { message: "..." }            │
```

### Session Versioning

The `users` table has a `session_version` integer column.
The `session.version` middleware invalidates sessions when this value changes,
allowing forced logout of all active sessions for a user.

### Key Points

- Auth is **stateful** (session cookie), not JWT.
- Sanctum is configured with `SANCTUM_STATEFUL_DOMAINS` — the frontend origin must be listed.
- The frontend sends `withCredentials: true` on every request so the browser includes the cookie.
- No tokens are stored in `localStorage`.

---

## Testing

### Setup

- Pest (PHPUnit 11 under the hood), configured in `phpunit.xml`.
- Tests use **SQLite in-memory** (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`).
- `CACHE_STORE=array` (in-memory cache during tests).
- `SESSION_DRIVER=array` (in-memory sessions during tests).
- `BCRYPT_ROUNDS=4` for faster password hashing in tests.

### Running Tests

```bash
# Inside the backend container
docker compose exec backend php artisan test

# Or directly if vendor/ is available locally
cd backend && php artisan test
```

### Test Coverage (`tests/Feature/Auth/LoginTest.php`)

Tests are grouped with Pest `describe()` blocks:

| Group        | What is tested                                                    |
|--------------|-------------------------------------------------------------------|
| `login`      | Valid credentials (200 + user), wrong password (401), bad email (401) |
| `validation` | Missing email (422), invalid email format (422), missing password (422) |
| `me`         | Authenticated user gets own profile (200), unauthenticated (401)  |
| `logout`     | Authenticated user can logout (200)                               |
| `User model` | `isEmailVerified()` returns correct boolean                       |

### Factory

`UserFactory` creates users with:
- Random `name` and unique `email` (faker).
- Default `password`: `"password"` (hashed with bcrypt, rounds=4 in test env).
- `email_verified_at`: set to `now()` by default.
- State `unverified()`: sets `email_verified_at` to `null`.

---

## Conventions & Rules

### General

- **Code language**: English — all variable names, function names, comments, and string keys must be in English.
- **Displayed strings**: English (but always go through the i18n system, never hardcoded).
- New features always follow the MVC + Service + FormRequest + Resource pattern.
- No business logic in controllers or services that belongs in a model.
- No application logic in models.

### Adding a New API Endpoint

1. Create a `FormRequest` in `app/Http/Requests/<Domain>/`.
2. Add the logic to an existing or new `Service` in `app/Services/`.
3. Add a method to the controller — it must only call the service and return a response.
4. Add the route in `routes/api.php` with appropriate middleware.
5. Add a typed exception in `app/Exceptions/` if a new error case is introduced.
6. Register the exception handler in `bootstrap/app.php` if needed.
7. Add a `Resource` in `app/Http/Resources/` if a new model is exposed.
8. Add translations to `lang/en/messages.php`.
9. Write feature tests covering success + validation + unauthorized cases.

### Adding a New Frontend Page

1. Create the page in `src/pages/`.
2. Add all displayed strings to `src/i18n/locales/en.json`.
3. Use `useTranslation()` for every string — never hardcode text.
4. Wrap with `<ProtectedRoute>` in `App.tsx` if authentication is required.
5. Add any new API calls to the appropriate file in `src/api/`.

### Database Migrations

- Never add auth token columns to the `users` table (auth is session-based).
- Migration filenames follow the format: `YYYY_MM_DD_HHMMSS_description.php`.

---

## Code Preferences

These preferences apply to all code written in this project, both backend (PHP) and frontend (TypeScript/React).

### Early Return

Always prefer early return over nested conditionals. Return or throw as soon as a condition is not met, keeping the happy path at the lowest indentation level.

```php
// Bad
function process(User $user): string
{
    if ($user->isActive()) {
        if ($user->hasPermission()) {
            return doWork($user);
        }
    }
    return 'denied';
}

// Good
function process(User $user): string
{
    if (!$user->isActive()) {
        return 'denied';
    }

    if (!$user->hasPermission()) {
        return 'denied';
    }

    return doWork($user);
}
```

```typescript
// Bad
function getLabel(user: User): string {
    if (user.isActive) {
        if (user.isVerified) {
            return 'verified user'
        }
    }
    return 'inactive'
}

// Good
function getLabel(user: User): string {
    if (!user.isActive) return 'inactive'
    if (!user.isVerified) return 'unverified'
    return 'verified user'
}
```

### Named Boolean Conditions

Never pass raw expressions directly into `if` statements. Extract conditions into well-named variables first.
Boolean variables must use descriptive prefixes: `is`, `has`, `should`, `can`, `was`, `did`.

```php
// Bad
if ($user->email_verified_at !== null && $user->status === 'active') { ... }

// Good
$isEmailVerified = $user->email_verified_at !== null;
$isAccountActive = $user->status === 'active';

if ($isEmailVerified && $isAccountActive) { ... }
```

```typescript
// Bad
if (user.role === 'admin' && !user.suspended && permissions.includes('edit')) { ... }

// Good
const isAdmin = user.role === 'admin'
const isSuspended = user.suspended
const canEdit = permissions.includes('edit')

if (isAdmin && !isSuspended && canEdit) { ... }
```

---

## Running the Project

### First time setup

```bash
# 1. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp .env.postgres.example .env.postgres

# 2. Start everything (builds images, runs migrations)
npm run start
```

### Daily workflow

```bash
npm run start    # Start: docker compose up --build
npm run stop     # Stop:  docker compose down
```

### Creating a test user (Tinker)

```bash
docker compose exec backend php artisan tinker
# >>> App\Models\User::factory()->create(['email' => 'user@test.com', 'password' => 'password'])
```

### Running backend tests

```bash
docker compose exec backend php artisan test
```

### Installing new backend packages

```bash
# 1. Update composer.json manually
# 2. Rebuild to run composer install
docker compose up --build backend
```

### Installing new frontend packages

```bash
# 1. Update package.json manually
# 2. Rebuild to run npm install
docker compose up --build frontend
```
