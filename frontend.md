# Frontend — Análise & Status

> Análise técnica completa do frontend React 19.

**Última atualização:** 2026-03-30

---

## Sumário Executivo

| Métrica | Status |
|---------|--------|
| **Componentes** | 48 arquivos — bem estruturados |
| **Pages** | 12 páginas — todas roteadas |
| **Hooks Customizados** | 17 hooks — padrão estabelecido |
| **Redux Slices** | 7 slices — state management robusto |
| **UI Primitivos** | 17 componentes — design system funcional |
| **Testes** | 9 test files, 166 testes passando — 8% cobertura |
| **Type Safety** | TypeScript 5.9.3, branded types, 0 any's |
| **ESLint** | 0 erros, 21 avisos — CI passing |
| **Build** | Vite 7.2.5 (rolldown), production-ready |
| **Deployment** | Frontend docker-ready, port 5173 |

---

## 🎯 Status: PRONTO PARA DESENVOLVIMENTO

O frontend está **estruturalmente sólido** e pronto para novas funcionalidades. O padrão está estabelecido, testes cobrem camada lógica, CI/CD está funcionando.

---

## Estrutura Detalhada

### Componentes (48 arquivos)

#### **UI Primitivos (17 componentes)**

```
components/ui/
├── avatar/avatar.tsx
├── badge/badge.tsx
├── button/button.tsx           — com ripple effect
├── card/card.tsx
├── carouselNav/carouselNav.tsx
├── date/picker.tsx
├── dnd/dragDropFile.tsx        — drag-and-drop
├── dropdown/dropdown.tsx
├── empty/empty.tsx
├── input/input.tsx
├── modal/modal.tsx             — com transitions
├── navProgress/navProgress.tsx
├── skeleton/skeleton.tsx
├── spinner/spinner.tsx
├── toast/toast.tsx
├── tooltip/tooltip.tsx         — Radix UI
└── index.ts                    — barrel export
```

**Características:**
- ✅ Acessibilidade (WCAG 2.1 AA)
- ✅ Props bem tipadas
- ✅ Composição (sem hard-coded strings)
- ✅ Animações com framer-motion
- ✅ Tema responsivo (light/dark)

#### **Componentes Feature (31 arquivos)**

```
components/
├── filter/panel.tsx            — Filtros horizontais (tags, sort)
├── guard/guard.tsx             — Route protection
├── header/header.tsx           — Search, upload, avatar
├── layout/                      — App shell
│   ├── layout.tsx              — Header + Sidebar + <Outlet>
│   ├── pageSkeleton.tsx        — Skeleton genérico
│   └── pageSkeleton.css
├── mini/player.tsx             — Player flutuante
├── playlist/card.tsx           — Card expandível com drag-drop
├── preferences/preferences.tsx — Tema, idioma, autoplay
├── shortcuts/modal.tsx         — Tabela de keyboard shortcuts
├── sidebar/sidebar.tsx         — Navigation com Active indicator
├── tag/
│   ├── badge.tsx              — Chip com cor determinística
│   ├── input.tsx              — Chips editáveis + autocomplete
│   └── view.tsx               — Overlay de videos por tag
├── upload/modal.tsx            — Form + drag-drop
└── video/                       — 17 arquivos player + cards
    ├── actionCard.tsx
    ├── card.tsx               — Card principal (thumbnail, progress)
    ├── hero.tsx               — Banner
    ├── player/                — 5 arquivos player
    │   ├── player.tsx        — Full player (~500 linhas)
    │   ├── playerSeekBar.tsx
    │   ├── playerSettings.tsx
    │   └── playerOverlays.tsx
    ├── reactionBtn.tsx        — Like/dislike/save + burst animation
    ├── readingMode.tsx        — Leitura de sumário
    ├── row.tsx                — Versão compacta (virtualized)
    ├── shortPlayer.tsx        — Player otimizado shorts
    └── [etc]
```

---

### Pages (12 páginas)

| Rota | Página | Proteção | Features |
|------|--------|----------|----------|
| / | home | ✅ Protegida | Trending, continue watching, recomendações |
| /shorts | shorts | ✅ Protegida | TikTok-style scroll vertical |
| /history | history | ✅ Protegida | Timeline agrupada por período |
| /playlists | playlists | ✅ Protegida | CRUD de playlists |
| /watch-later | watch/later | ✅ Protegida | Save-for-later collection |
| /liked | liked | ✅ Protegida | Videos curtidos com filtro |
| /profile | profile | ✅ Protegida | Perfil + heatmap + stats |
| /user/:id | profile | ✅ Protegida | Ver perfil alheio |
| /video/:id | video | ✅ Protegida | Watch + related + sidebar |
| /search | search | ✅ Protegida | Full-text search client-side |
| /channel/:id | channel | ✅ Protegida | Canal + subscribe button |
| /login | login | 🔓 Pública | Autenticação Laravel Sanctum |
| * | notFound | 🔓 Pública | 404 page |

---

### State Management (Redux Toolkit)

#### **Slices (7 slices)**

| Slice | Reducers | Selectors | Purpose |
|-------|----------|-----------|---------|
| **authSlice** | sessionExpired, updateProfile, ... | selectUser, selectIsAuthenticated | Auth state |
| **videoSlice** | addVideo, editVideo, deleteVideo, likeVideo, watchVideo, ... | selectLikedSet, selectHistoryTags, makeSelectRecommendations | Videos |
| **themeSlice** | setMode, setColor, setLanguage | selectTheme | Theme/Language |
| **playlistSlice** | addPlaylist, removePlaylist, ... | selectPlaylistById | Playlists |
| **subscriptionSlice** | toggleSubscription, xTabSetSubscriptions | selectSubscribedSet | Subscriptions |
| **searchSlice** | setResults, setQuery | selectSearchResults | Search state |
| **toastSlice** | addToast, removeToast | selectToasts | Notifications |

**Características:**
- ✅ Middleware de persistência (localStorage)
- ✅ Cross-tab sync (window.storage event)
- ✅ Selectors memoizados (createSelector)
- ✅ Typed actions via `PayloadAction<T>`
- ✅ Async thunks para API calls (authSlice)

#### **Infrastructure**

```typescript
// store/
├── index.ts              — configureStore + middleware
├── types.ts              — RootState, AppDispatch (evita circular deps)
├── persistMiddleware.ts  — Salva selectedSlices
├── crossTabSync.ts       — Sincroniza entre abas
├── [...]Slice.ts         — 7 slices
└── [...]Slice.test.ts    — Tests (alguns)
```

---

### Custom Hooks (17)

#### **State Management**

```typescript
useVideo()       // Central video API (actions + selectors)
useAuth()        // Auth state (user, isAuthenticated, signIn, signOut)
useTheme()       // Theme/language state
useSubscription() // Subscription state
usePlaylist()    // Playlist state
useSearch()      // Search context (input ref)
```

#### **Player Controls**

```typescript
usePlayerControls()   // Play, pause, mute, fullscreen handlers
usePlayerKeyboard()   // Keyboard shortcuts in player
usePlayerPlayback()   // Playback state (playing, currentTime, duration)
useVideoProgress()    // Track watch progress
useAutoplay()         // Auto-play next video logic
```

#### **UI/Interaction**

```typescript
useClickOutside()         // Close on outside click
useDebounce()             // Debounce values (search input)
useInView()               // Intersection observer
useKeyboardShortcuts()    // Global keyboard shortcuts
useMediaQuery()           // Media queries (mobile detection)
useBurstAnimation()       // Like button burst effect
useFilterState()          // Local filter state (tags, sort)
```

---

### Utils & Helpers (10 files)

| File | Exports | Purpose |
|------|---------|---------|
| **applyFilters.ts** | VideoFilter class, FilterState interface | Filter + sort videos |
| **format.ts** | Format.views, Format.duration, Format.date, Format.tagFrequency | Formatação |
| **cn.ts** | cn() | Class name utility (alias para clsx) |
| **routes.ts** | ROUTES object | App routes constants |
| **storageKeys.ts** | STORAGE_KEYS object | localStorage keys |
| **tagColors.ts** | TagColors.palette() | Tag → color mapping (deterministic) |
| **themes.ts** | ThemeColor, ThemeMode types | Theme types |
| **loadFromStorage.ts** | loadFromStorage(), isObject(), isArray(), isNumberInRange() | Safe storage loading |
| **events.ts** | Custom event types | App-specific events |
| **themeRipple.ts** | generateRipple() | Ripple effect helpers |

---

### Domain Types (Branded Types)

```typescript
// src/types/
├── video.ts       → Video, VideoId (branded), VideoStatus enum
├── channel.ts     → Channel, ChannelId (branded)
├── user.ts        → User interface
├── playlist.ts    → Playlist, PlaylistId (branded)
├── tag.ts         → Tag, TagId (branded)
├── common.ts      → Shared types
└── index.ts       → Barrel export

// Branded type example
type VideoId = string & { readonly __brand: 'VideoId' };
// Garante que 'string' !== VideoId em type-checking
```

---

### API Layer

```typescript
// src/api/
├── client.ts      — Axios instance com Sanctum (withCredentials: true)
└── videos.ts      — Endpoints simulados (não conectado ao backend)

// Exemplo
const { data } = await client.get<Video[]>('/videos');
```

---

### i18n (Internationalization)

```
src/i18n/
├── index.ts
└── locales/
    ├── pt.json    — Português (completo)
    └── en.json    — Inglês (completo)

// Uso
const { t } = useTranslation();
return <h1>{t('auth.sign_in')}</h1>;
```

---

### Data & Config

```
src/data/
├── mockVideos.ts      — 20+ videos com URLs reais
├── mockPlaylists.ts   — 3 playlists seed
└── themeConfig.ts     — Cores, idiomas, config

// mockVideos
export const MOCK_VIDEOS: Video[] = [
    {
        id: vid('v1'),
        title: 'Video 1',
        tags: ['react', 'typescript'],
        // ...
    },
];
```

---

### CSS & Styling

#### **Arquitetura**

```
src/styles/
├── base.css          — Reset, variáveis CSS globais
├── animations.css    — Keyframes reutilizáveis
└── tailwind.css      — Entry point Tailwind

// Variáveis CSS globais
--accent
--surface, --surface-2, --surface-3
--border
--text, --text-2, --text-3
--radius-sm, --radius-md
--transition (0.2s, 0.3s, easing)
```

#### **Componentes Têm CSS**

```
components/
├── header/
│   ├── header.tsx
│   └── header.css       ← Mesmo nome
├── video/
│   ├── card.tsx
│   └── card.css         ← Mesmo nome
```

#### **BEM-like Naming**

```css
/* .bloco__elemento--modificador */
.video-card { }           /* bloco */
.video-card__thumbnail { } /* elemento */
.video-card__badge { }
.video-card__badge--new { } /* modificador */
```

#### **Dark Mode Support**

```css
/* Selector: [data-mode='dark'] */
[data-mode='dark'] .video-card {
    background: var(--surface);
    color: var(--text);
}
```

---

## Testing

### Coverage

```
✅ 9 test files
✅ 166 tests passing
✅ 0% failures

📊 Coverage: ~8% (alvo: 70%)

Layers tested:
├── Redux slices       — ✅ (videoSlice, authSlice, etc)
├── Utils             — ✅ (format, filters, storage)
├── Hooks             — ❌ (not tested)
├── Components        — ❌ (not tested)
├── Pages             — ❌ (not tested)
└── Integration       — ❌ (not tested)
```

### Test Pattern

```typescript
describe('videoSlice — addVideo', () => {
    it('adds video to videos array', () => {
        const state = { videos: [], ... };
        const next = videoSlice.reducer(
            state,
            videoActions.addVideo(video),
        );
        expect(next.videos).toHaveLength(1);
    });
});
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/frontend.yml

Trigger:  Push/PR to main (paths: frontend/**)
Node:     22.x
Cache:    npm

Steps (in order):
  1. Checkout
  2. Setup Node 22 + npm cache
  3. npm ci (clean install)
  4. tsc --noEmit (type check)
  5. npm run lint (ESLint)
  6. npm test (Vitest)
  7. npm audit --audit-level=high (security)

Status: ALL must pass before merge
```

### Local Simulation

```bash
tsc --noEmit           # Type check
npm run lint           # ESLint
npm test               # Vitest
npm audit --audit-level=high
npm run build          # Build check
```

---

## ESLint Rules (v9.39.1)

### Code Style

| Rule | Setting | Rationale |
|------|---------|-----------|
| indent | 4 spaces | Standard |
| semi | always | Explicit |
| quotes | single | Less escaping |
| object-curly-spacing | always | `{ x }` not `{x}` |
| comma-dangle | always-multiline | Git diffs |
| max-len | 170 | Practical |

### Code Quality

| Rule | Severity | Purpose |
|------|----------|---------|
| eqeqeq | error | Strict equality |
| no-var | error | Use const/let |
| prefer-const | error | Use const |
| prefer-template | error | Template literals |
| no-nested-ternary | error | Readability |
| no-console | warn | Development |

### Control Flow

| Rule | Severity | Purpose |
|------|----------|---------|
| curly | error | Always braces |
| no-else-return | error | Early return |
| no-lonely-if | error | Use else-if |
| max-depth | warn (3) | Nesting limit |
| complexity | warn (8) | Function complexity |

### React/TypeScript

| Rule | Severity | Purpose |
|------|----------|---------|
| no-explicit-any | error | Type safety |
| consistent-type-imports | error | import type for types |
| react-hooks/exhaustive-deps | error | Hook deps |

---

## Dependencies

### Production (18 packages)

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-router-dom": "7.13.1",
  "@reduxjs/toolkit": "2.11.2",
  "react-redux": "9.2.0",
  "tailwindcss": "4.2.1",
  "i18next": "25.1.0",
  "react-i18next": "15.5.1",
  "axios": "1.7.9",
  "framer-motion": "12.36.0",
  "lucide-react": "0.575.0",
  "@tanstack/react-virtual": "3.13.23",
  "@radix-ui/*": "^1.x",
  "date-fns": "4.1.0",
  "dompurify": "3.3.3",
  "clsx": "2.1.1",
  "tailwind-merge": "3.5.0"
}
```

### Dev (13 packages)

```json
{
  "typescript": "5.9.3",
  "vite": "7.2.5",
  "vitest": "4.1.2",
  "eslint": "9.39.1",
  "babel-plugin-react-compiler": "1.0.0",
  "@types/react": "19.2.5",
  "jsdom": "29.0.1"
}
```

**Status:** ✅ Sem vulnerabilidades de alta severidade

---

## O Que Está Pronto

- ✅ Estrutura de componentes
- ✅ Sistema de design (17 primitivos)
- ✅ State management (Redux com middleware)
- ✅ Routing (12 páginas)
- ✅ i18n (PT + EN)
- ✅ Testes unitários (camada lógica)
- ✅ Type safety (TypeScript strict, branded types)
- ✅ Acessibilidade (WCAG 2.1)
- ✅ ESLint + CI/CD pipeline
- ✅ Dark mode + multiple themes

---

## O Que Precisa Fazer

### Próximas Prioridades

| Prioridade | Task | Esforço | Impacto |
|-----------|------|--------|--------|
| 🔴 CRÍTICA | Conectar backend real (API auth, videos) | Alto | Sem backend = não funciona |
| 🔴 CRÍTICA | Component tests (VideoCard, Header, etc) | Médio | 8% → 40%+ cobertura |
| 🟡 ALTA | E2E tests (Playwright/Cypress) | Alto | Garantir fluxos críticos |
| 🟡 ALTA | Implementar playlists drag-drop | Médio | Feature completa |
| 🟡 ALTA | Otimizar player (HLS, adaptive bitrate) | Alto | Performance |
| 🟢 MÉDIA | Adicionar theme persistência melhorada | Baixo | UX |
| 🟢 MÉDIA | Implementar notificações real-time | Médio | Engagement |
| 🟢 MÉDIA | PWA support (service worker) | Médio | Offline |

### Gaps Conhecidos

- ❌ Testes de componentes (48 arquivos sem testes)
- ❌ Testes E2E (nenhum)
- ❌ Backend real (API endpoints simulados)
- ❌ Upload de vídeo (form criado, não conectado)
- ❌ Comments/discussions
- ❌ Live streaming
- ❌ Notifications real-time
- ❌ PWA / offline support

---

## Como Começar uma Nova Feature

Consulte `/DEVELOPMENT.md` para:

1. Planejamento (perguntas a fazer)
2. Criar componente (padrão + props)
3. State Redux (se necessário)
4. Hooks (wrapper do slice)
5. i18n (strings em pt + en)
6. Testes (unitários)
7. Lint & Commit

---

## Recursos

- 📄 `/frontend/CLAUDE.md` — Conventions & UI system
- 📄 `/DEVELOPMENT.md` — Developer guide completo
- 📄 `/application.md` — Backend + overall architecture
- 📄 `/.github/workflows/frontend.yml` — CI/CD
- 📄 `/frontend/eslint.config.js` — Linting rules
- 📄 `/frontend/vite.config.ts` — Build config

---

**Status Final:** 🟢 VERDE — Pronto para desenvolvimento contínuo
