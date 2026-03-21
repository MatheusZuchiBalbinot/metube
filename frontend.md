# Frontend — Análise Completa

> Gerado em 2026-03-21 — análise do estado atual do frontend React 19.

---

## Sumário

- [Estrutura Geral](#estrutura-geral)
- [Tecnologias](#tecnologias)
- [State Management (Redux)](#state-management-redux)
- [Context API & Hooks de Contexto](#context-api--hooks-de-contexto)
- [Componentes](#componentes)
- [Páginas](#páginas)
- [Utils & Hooks](#utils--hooks)
- [API Layer](#api-layer)
- [Dados Mock](#dados-mock)
- [i18n](#i18n)
- [Testes](#testes)
- [CSS & Estilos](#css--estilos)
- [Roteamento](#roteamento)
- [Problemas & Gaps](#problemas--gaps)
- [O que implementar a seguir](#o-que-implementar-a-seguir)

---

## Estrutura Geral

```
frontend/src/
├── App.tsx                  — roteamento principal + providers
├── main.tsx                 — entry point
├── app.css                  — estilos globais
├── api/
│   ├── client.ts            — axios instance (Sanctum, withCredentials)
│   └── videos.ts            — funções de API (não conectadas ao backend ainda)
├── components/
│   ├── filter/panel.tsx     — FilterPanel horizontal (chips de tags, sort, advanced)
│   ├── header/header.tsx    — AppHeader com search, upload, avatar dropdown
│   ├── layout/
│   │   ├── layout.tsx       — shell: Header + Sidebar + <Outlet>
│   │   ├── pageSkeleton.tsx — skeleton de página genérico
│   │   └── pageSkeleton.css
│   ├── mini/player.tsx      — MiniPlayer flutuante e arrastável
│   ├── playlist/card.tsx    — PlaylistCard expandível com drag-drop
│   ├── preferences/preferences.tsx — tema, cor, idioma, autoplay
│   ├── shortcuts/modal.tsx  — tabela de keyboard shortcuts
│   ├── sidebar/sidebar.tsx  — nav com active indicator animado
│   ├── tag/
│   │   ├── badge.tsx        — chip de tag com cor determinística
│   │   ├── input.tsx        — chips editáveis com autocomplete
│   │   └── view.css         — styles da tag view overlay
│   ├── ui/                  — primitivos reutilizáveis
│   │   ├── avatar/          ├── badge/     ├── button/
│   │   ├── card/            ├── carouselNav/ ├── date/picker
│   │   ├── dnd/             ├── dropdown/  ├── empty/
│   │   ├── input/           ├── modal/     ├── navProgress/
│   │   ├── skeleton/        ├── toast/     └── tooltip/
│   │   └── index.ts         — barrel export `@ui`
│   ├── upload/modal.tsx     — form completo de upload com DnD
│   └── video/
│       ├── actionCard.tsx   — VideoCard com action button genérico
│       ├── card.tsx         — card com thumbnail, progress, tags, ações
│       ├── hero.css         — estilos de hero/banner
│       ├── player.tsx       — player completo (default/mini) ~500 linhas
│       ├── reactionBtn.tsx  — like/dislike/save com burst animation
│       ├── readingMode.tsx  — leitura do sumário em modal
│       ├── row.tsx          — versão compacta para listas virtualizadas
│       ├── rowSkeleton.tsx  — skeleton do row
│       ├── savePopover.tsx  — popover de salvar em playlist
│       ├── shortPlayer.tsx  — player otimizado para shorts (sem scrubber)
│       └── statusBadges.tsx — badges: New, Watched, Scheduled
├── context/
│   ├── searchContext.tsx    — ref do input de busca (foco via atalho)
│   ├── useFilterState.ts   — estado local de filtros (não Redux)
│   ├── usePlaylist.ts      — API simples sobre playlistSlice
│   ├── useSubscription.ts  — API simples sobre subscriptionSlice
│   └── useVideo.ts         — hook central de vídeos (ações + seletores)
├── data/
│   ├── mockPlaylists.ts    — 3 playlists seed
│   ├── mockVideos.ts       — 20+ vídeos seed com URLs reais
│   └── themeConfig.ts      — paleta de cores e idiomas disponíveis
├── i18n/
│   ├── index.ts            — configuração do i18next
│   └── locales/
│       ├── en.json         — strings em inglês
│       └── pt.json         — strings em português
├── pages/
│   ├── channel/channel.tsx — página de canal com subscribe
│   ├── history/history.tsx — histórico agrupado por período
│   ├── home/home.tsx       — trending, continue watching, recomendações
│   ├── liked/liked.tsx     — vídeos curtidos
│   ├── notFound/           — página 404
│   ├── playlists/playlists.tsx — gerenciamento de playlists
│   ├── profile/profile.tsx — perfil, heatmap, stats
│   ├── search/search.tsx   — busca full-text client-side
│   ├── shorts/shorts.tsx   — TikTok-style vertical scroll
│   ├── video/video.tsx     — página de vídeo com sidebar
│   └── watch/later.tsx     — watch later list
├── store/
│   ├── index.ts            — configureStore com 7 slices + persistMiddleware
│   ├── crossTabSync.ts     — sync de tema entre abas via storage event
│   ├── localStorageMiddleware.ts — middleware legado (não em uso)
│   ├── persistMiddleware.ts     — listeners com debounce para persistência
│   ├── playlistSlice.ts    — CRUD de playlists
│   ├── playlistSlice.test.ts
│   ├── searchSlice.ts      — histórico de buscas (máx 5)
│   ├── subscriptionSlice.ts — inscrições em canais
│   ├── toastSlice.ts       — notificações (máx 3)
│   ├── videoSlice.ts       — vídeos, histórico, curtidas, progresso, mini player
│   └── videoSlice.test.ts
├── styles/
│   ├── animations.css      — keyframes reutilizáveis
│   └── base.css            — CSS variables por modo/cor
└── utils/
    ├── applyFilters.ts     — VideoFilter (filtragem + ordenação)
    ├── applyFilters.test.ts
    ├── format.ts           — Format.duration/views/relativeDate
    ├── format.test.ts
    ├── loadFromStorage.ts  — leitura segura de localStorage com fallback
    ├── storageKeys.ts      — enum de chaves do localStorage
    ├── useAutoplay.ts      — countdown 5s para próximo vídeo
    ├── useBurstAnimation.ts — trigger de animação por N ms
    ├── useClickOutside.ts  — click fora de ref
    ├── useDebounce.ts      — debounce de valor reativo
    ├── useInView.ts        — IntersectionObserver com sync check
    ├── useMediaQuery.ts    — media query reativa
    ├── usePlayerControls.ts  — visibilidade dos controles do player
    ├── usePlayerKeyboard.ts  — keyboard shortcuts do player
    ├── usePlayerPlayback.ts  — estado de reprodução (isPlaying, volume, etc)
    └── useVideoProgress.ts   — progresso, seek, abertura do MiniPlayer
```

---

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| React 19 + TypeScript | framework principal |
| Vite | bundler + dev server |
| Redux Toolkit | state management global |
| React Router v6 | roteamento |
| i18next + react-i18next | EN/PT |
| Radix UI | primitivos acessíveis (Tooltip, Popover, Dialog) |
| Framer Motion | animações, drag-drop, reorder |
| TanStack React Virtual | virtualização de listas longas |
| Lucide React | ícones |
| Tailwind CSS v4 | utilitários pontuais (não primary) |
| Axios | HTTP client (Sanctum / withCredentials) |
| Vitest | testes unitários |

---

## State Management (Redux)

### Store (`src/store/index.ts`)

7 slices registrados + `persistMiddleware` (listener-based):

```typescript
{
  video:        VideoState
  theme:        ThemeState       // mode + color
  auth:         AuthState        // user, loading, error
  toast:        ToastState       // máx 3 toasts
  subscription: SubscriptionState
  playlist:     PlaylistState
  search:       SearchState
}
```

Hooks tipados exportados: `useAppDispatch()`, `useAppSelector()`.

---

### Video Slice (`src/store/videoSlice.ts`)

O maior e mais complexo. Contém quase toda a lógica de negócio do frontend.

**Estado completo:**

```typescript
interface VideoState {
  videos: Video[]
  watchHistory: string[]                    // IDs, mais recente primeiro
  likedVideos: string[]
  dislikedVideos: string[]
  savedVideos: string[]
  videoProgress: Record<string, number>     // videoId → % assistido
  autoplay: boolean
  uploadModalOpen: boolean
  activeTagView: TagView | null             // { tag, fromVideoId }
  miniPlayer: MiniPlayerState | null        // { videoId, currentTime, seekSession }
  pendingVideoSeek: { videoId, time } | null
  watchEvents: WatchEvent[]                 // { videoId, date } para heatmap
  pinnedVideoId: string | null
  theaterMode: boolean
  shortsMuted: boolean
  shortsVolume: number                      // 0–1
  loading: boolean
  error: string | null
}
```

**Reducers:**

| Reducer | Comportamento |
|---------|---------------|
| `addVideo(video)` | UUID aleatório, 0 views |
| `editVideo({id, ...partial})` | merge parcial |
| `deleteVideo(id)` | remove + limpa de todas as listas |
| `likeVideo(id)` | toggle; remove de disliked |
| `dislikeVideo(id)` | toggle; remove de liked |
| `saveVideo(id)` | toggle |
| `watchVideo(id)` | move para frente do history + cria WatchEvent |
| `removeFromHistory(id)` | remove do watchHistory |
| `clearHistory()` | limpa tudo |
| `updateProgress({videoId, percent})` | salva % por vídeo |
| `setAutoplay(bool)` | |
| `openUploadModal()` / `closeUploadModal()` | |
| `openTagView({tag, fromVideoId})` | |
| `closeTagView()` | |
| `openMiniPlayer({videoId, currentTime})` | |
| `closeMiniPlayer()` | |
| `setPendingVideoSeek({videoId, time})` | seek a executar ao navegar |
| `clearPendingVideoSeek()` | |
| `pinVideo(id)` | toggle pin |
| `unpinVideo()` | |
| `setTheaterMode(bool)` | |
| `setShortsMuted(bool)` | |
| `setShortsVolume(number)` | |

**Selectors com memoização:**

```typescript
selectHistoryTags(state)          // Set<string> de tags dos assistidos
selectPublishedVideos(state)      // publicados ou agendados no passado
selectLikedSet(state)             // Set<string> para lookup O(1)
selectDislikedSet(state)
selectSavedSet(state)
makeSelectRecommendations(limit)  // algoritmo abaixo
```

**Algoritmo de recomendações:**
1. Extrai tags dos vídeos assistidos (`historyTags`)
2. Para cada vídeo publicado: `score = tagMatch * 0.85 + viewsBoost * 0.15`
   - `tagMatch` = proporção de tags do vídeo presentes no historyTags
   - `viewsBoost` = log normalizado de views
3. Ordena por score desc

**Dados seed:**
- `MOCK_VIDEOS` — 20+ vídeos
- `SEED_HISTORY` — `['v003','v001','v008','v005','v007']`
- `SEED_PROGRESS` — `{ v001: 67, v005: 38, v008: 82 }`
- `buildSeedEvents()` — 5 WatchEvents simulados

---

### Playlist Slice (`src/store/playlistSlice.ts`)

```typescript
interface Playlist {
  id: string
  name: string
  videoIds: string[]   // ordem preservada (drag-drop)
  createdAt: string    // ISO date
}
```

Reducers: `createPlaylist`, `renamePlaylist`, `deletePlaylist`, `addVideoToPlaylist`, `removeVideoFromPlaylist`, `reorderVideosInPlaylist`.

Extra reducer: escuta `video/deleteVideo` e remove o videoId de todas as playlists (cascade).

---

### Search Slice (`src/store/searchSlice.ts`)

```typescript
interface SearchState {
  recentSearches: string[]  // máx 5, deduplicado
}
```

Reducers: `addRecentSearch`, `removeRecentSearch`, `clearRecentSearches`.

Estado inicial carregado de localStorage via `loadRecentSearches()`.

---

### Subscription Slice (`src/store/subscriptionSlice.ts`)

```typescript
interface SubscriptionState {
  subscribedChannelIds: string[]
}
const SEED = ['ch_1', 'ch_3', 'ch_5']
```

Reducer: `toggleSubscription(channelId)`.
Selector: `selectSubscribedSet(state)` → `Set<string>`.

---

### Toast Slice (`src/store/toastSlice.ts`)

```typescript
interface Toast { id, message, type: 'success'|'error'|'info' }
const MAX_TOASTS = 3
```

Reducers: `addToast({message, type})`, `removeToast(id)`.
Ao exceder 3, o mais antigo é removido com `shift()`.

---

### Persistência (`src/store/persistMiddleware.ts`)

`createListenerMiddleware` do Redux Toolkit. Listeners separados por slice com debounce individualizado:

| Listener | Escuta | Debounce | Persiste |
|----------|--------|----------|---------|
| video | `video/*` | 400ms | watchHistory, liked, disliked, saved, progress, autoplay, watchEvents, pinnedVideoId, shortsMuted, shortsVolume |
| theme | `theme/*` | 0ms (flush) | mode, color + `document.documentElement.dataset` |
| subscription | `subscription/*` | 400ms | subscribedChannelIds |
| playlist | `playlist/*` + `video/deleteVideo` | 400ms | playlists |
| search | `search/*` | 400ms | recentSearches |

**Arquivo `localStorageMiddleware.ts`:** middleware alternativo mais simples (compara prev/next state). **Não está em uso** — provavelmente legado do desenvolvimento inicial.

---

### Cross-tab Sync (`src/store/crossTabSync.ts`)

`initCrossTabSync(dispatch)` escuta o evento `storage` do browser para sincronizar apenas o **tema** (mode + color) entre abas. Vídeos, playlists e inscrições são eventual-consistent (reload necessário).

---

## Context API & Hooks de Contexto

### SearchContext (`src/context/searchContext.tsx`)

```typescript
interface SearchContextValue {
  registerSearchInput: (el: HTMLInputElement | null) => void
  focusSearch: () => void
}
```

`AppHeader` registra o ref do input. O Layout chama `focusSearch()` quando o atalho de teclado é ativado. Provedor em `App.tsx`.

---

### useVideo (`src/context/useVideo.ts`)

Hook central. Abstrai Redux e expõe API estável para todos os componentes de vídeo.

**Seletores granulares:**
`videos`, `watchHistory`, `watchEvents`, `pinnedVideoId`, `videoProgress`, `autoplay`, `uploadModalOpen`, `activeTagView`, `miniPlayer`, `pendingVideoSeek`, `shortsMuted`, `shortsVolume`

**Seletores computados:**
`historyTags`, `publishedVideos`, `likedVideos` (Set), `dislikedVideos` (Set), `savedVideos` (Set), `recommendations` (top 200)

**Ações:**
`addVideo`, `editVideo`, `deleteVideo`, `likeVideo`, `dislikeVideo`, `saveVideo`, `watchVideo`, `removeFromHistory`, `clearHistory`, `updateProgress`, `setAutoplay`, `openUploadModal`, `closeUploadModal`, `openTagView`, `closeTagView`, `openMiniPlayer`, `closeMiniPlayer`, `setPendingVideoSeek`, `consumePendingVideoSeek`, `pinVideo`, `unpinVideo`, `setShortsMuted`, `setShortsVolume`

---

### usePlaylist (`src/context/usePlaylist.ts`)

```typescript
{
  playlists,
  createPlaylist(id, name),
  renamePlaylist(id, name),
  deletePlaylist(id),
  addVideoToPlaylist(playlistId, videoId),
  removeVideoFromPlaylist(playlistId, videoId),
  reorderVideosInPlaylist(playlistId, videoIds),
  getVideoPlaylistIds(videoId): string[]   // quais playlists contêm este vídeo
}
```

---

### useSubscription (`src/context/useSubscription.ts`)

```typescript
{
  subscribedChannelIds,
  subscribedSet,
  toggleSubscription(channelId),
  isSubscribed(channelId): boolean
}
```

---

### useFilterState (`src/context/useFilterState.ts`)

Estado **local** (não Redux) para filtros de vídeos. Reutilizado em várias páginas.

```typescript
interface FilterState {
  tags: string[]
  year: number | null
  dateFrom: string | null
  dateTo: string | null
  sortBy: 'recent' | 'views' | 'az'
}

{
  filterState,
  setFilterState,
  hasActiveFilters: boolean,
  clearFilters()
}
```

---

## Componentes

### FilterPanel (`filter/panel.tsx`)

- Chips de tags inline (8 visíveis, restante em dropdown)
- Sort dropdown: Recent, Views, A-Z
- Advanced filters: Year, Date range
- Botão "Clear filters" (aparece quando `hasActiveFilters`)
- Responsivo, Esc fecha dropdowns

---

### AppHeader (`header/header.tsx`)

- Logo, search input com dropdown de buscas recentes
- Detecção de scroll para estilo compacto
- Notificações, botão de upload, avatar dropdown
- Registra ref do input de busca via `SearchContext`

---

### AppSidebar (`sidebar/sidebar.tsx`)

- NavLinks: Home, Shorts, History, Playlists, Watch Later, Liked, Your Videos
- Active indicator animado com Framer Motion spring
- Seção de subscriptions dinâmica
- `SidebarLink`: Radix Tooltip + NavLink wrapper
- Colapsável em mobile

---

### AppLayout (`layout/layout.tsx`)

Shell principal:
- Renderiza Header + Sidebar + `<Outlet>`
- TagView overlay (quando ativo)
- MiniPlayer (exceto na `/video/:id`)
- ShortcutsModal, ToastContainer, NavProgress
- Keyboard shortcuts globais

---

### VideoPlayer (`video/player.tsx`) — ~500 linhas

Dois modos: `default` (completo) e `mini` (minificado).

**Features modo default:**
- Play/pause, skip ±5s, volume slider, mute
- Fullscreen e theater mode
- Scrubber com preview thumbnail via Canvas
- Buffered visualization
- Settings panel: playback speed (0.5x–2x), chapters
- Chapters clicáveis com seek
- Double-click: play/pause ou seek
- Skip indicator com animação

**Features modo mini:**
- Floating window arrastável (Framer Motion)
- Play/pause, expand, close
- Resume from saved position

**Hooks internos usados:**
- `usePlayerControls` — visibilidade dos controles
- `usePlayerKeyboard` — keyboard shortcuts
- `usePlayerPlayback` — estado de reprodução
- `useVideoProgress` — persistência de progresso + abertura de MiniPlayer

**Keyboard shortcuts do player:**
| Tecla | Ação |
|-------|------|
| Space | play/pause |
| → / ← | +5s / -5s |
| ↑ / ↓ | volume (modo default) |
| M | mute toggle |
| F | fullscreen (modo default) |
| T | theater mode (modo default) |

---

### VideoCard (`video/card.tsx`)

- Thumbnail + progress bar visual
- Title, channel, views, duração
- Tag badges (máx 3 + "+X more") com cor determinística
- StatusBadges: New, Scheduled, Watched
- Ações (se `showActions`): Pin, Save, Edit, Delete
- Cor de fundo baseada na primeira tag

---

### VideoRow (`video/row.tsx`)

Versão compacta para listas virtualizadas (search, history). Thumbnail pequeno + title + channel + duração.

---

### ReactionBtn (`video/reactionBtn.tsx`)

Like/Dislike/Save com burst animation. Estado visual ativo/inativo.

---

### SavePopover (`video/savePopover.tsx`)

Popover com lista de playlists. Salvar em playlist. Criar nova playlist inline.

---

### TagBadge (`tag/badge.tsx`)

Chip com cor determinística. Opcional: clickable via `role="button"`.

---

### TagInput (`tag/input.tsx`)

Chips editáveis com autocomplete de sugestões. Adicionar/remover tags.

---

### MiniPlayer (`mini/player.tsx`)

Floating window arrastável com Framer Motion. Play/pause, expand (navega para `/video/:id`), close. Resume from saved position via `setPendingVideoSeek`.

---

### PlaylistCard (`playlist/card.tsx`) — em `src/components/playlist/`

- Expandível para lista de vídeos
- Drag-drop reorder com Framer Reorder
- Rename modal, delete confirmation
- Remove individual video da playlist

---

### Primitivos UI (`src/components/ui/`)

Barrel export via `@ui`:

| Componente | Descrição |
|------------|-----------|
| `Button` | variantes: primary, secondary, ghost, danger; sizes: sm, md, lg, icon |
| `Input` | text input com icon, error, label |
| `Modal` | dialog com title, footer, size |
| `Dropdown` | select customizado com popover |
| `Tooltip` | wrapper Radix com delay |
| `Avatar` | imagem + iniciais fallback |
| `Badge` | label de status |
| `Card` | container com borda |
| `DatePicker` | popover com calendário |
| `Spinner` | loading indicator |
| `DragAndDrop` | área de upload de arquivo |
| `CarouselNav` | navegação de carrossel |
| `Empty` | estado vazio genérico |
| `NavProgress` | barra de progresso de navegação |
| `Skeleton` | placeholder de loading |

---

## Páginas

### HomePage (`home.tsx`)

Três seções animadas (Framer Motion com delay):

1. **Trending** — últimos 730 dias, top 8 por views, carrossel horizontal com `useInView` para lazy render
2. **Continue Watching** — vídeos com progresso entre 4% e 96%, até 8 itens
3. **Recomendações** — algoritmo do store com FilterPanel acima

Estados vazios para: sem vídeos, sem histórico, resultado filtrado vazio.

---

### VideoPage (`video.tsx`) — alta complexidade

**Player section:**
- VideoPlayer em modo default
- Summary (ReadingMode)
- Reactions: like/dislike/save com burst
- Share dropdown (copy link, copy com timestamp)

**Sidebar:**
- Abas: Related | Summary
- Filtro de relacionados
- Chapters clicáveis com seek

**Autoplay countdown:** 5s antes de navegar para próximo

**Keyboard shortcuts:** K (like), S (save), T (theater), F (fullscreen)

---

### SearchPage (`search.tsx`)

- Busca full-text: title, description, channel, tags
- Virtualização via TanStack Virtual (~136px por row estimado)
- `HighlightedText` para destacar match no resultado
- Termo em query string (`?q=`) — não persiste em Redux
- Debounce 250ms

---

### ProfilePage (`profile.tsx`)

- **Abas:** Seus vídeos | Liked | History
- **Edit profile modal:** nome, bio
- **Heatmap de atividade:** 14d ou 30d, grid de cores por intensidade baseada em watchEvents
- **Pinned video:** destaque fixado no perfil
- **Top tags** dos vídeos assistidos
- **Watch time** agregado de watchEvents
- Filtros por aba
- Confirmação antes de deletar vídeo

---

### ShortsPage (`shorts.tsx`)

TikTok-style vertical scroll.

`ShortItem` (memoizado):
- Reactions: like/dislike/save com burst
- Volume slider com toggle mute
- Description colapsável (Esc ou click no overlay)
- Tag badges clicáveis → openTagView
- Canal linkado

Estado lifted: `muted` e `volume` compartilhados entre shorts.

---

### HistoryPage (`history.tsx`)

- Agrupado por período: Today, Yesterday, This Week, Older
- Virtualizado com TanStack Virtual
- Search input debounced 250ms
- Period filter: All, Today, Week, Month
- Clear all com modal de confirmação
- Remove individual com toast

---

### LikedPage / WatchLaterPage (`liked.tsx`, `watch/later.tsx`)

Grid de `VideoActionCard`. Filtros aplicáveis. Empty state.
- Liked: botão "Unlike"
- Watch Later: botão "Remove"

---

### PlaylistsPage (`playlists.tsx`)

Lista de `PlaylistCard` expansíveis. Botão "New Playlist". Drag-drop reorder interno de cada playlist.

---

### ChannelPage (`channel.tsx`)

Card com avatar, nome, `since` year. Subscribe toggle. Abas: Videos | Most Watched.

---

## Utils & Hooks

### VideoFilter (`utils/applyFilters.ts`)

```typescript
class VideoFilter {
  static emptyState(): FilterState
  static apply(videos: Video[], filterState: FilterState): Video[]
}
```

Lógica:
- **Tags:** AND lógico — vídeo deve ter **todos** os tags selecionados
- **Year:** `getFullYear()` match
- **Date range:** `dateFrom` ≤ publishedAt ≤ `dateTo 23:59:59Z`
- **Sort:** RECENT = desc publishedAt | VIEWS = desc views | AZ = asc title

---

### Format (`utils/format.ts`)

```typescript
class Format {
  static duration(seconds: number): string     // "2:45:30" ou "4:23"
  static views(count: number): string          // "1.5M", "234K", "12"
  static relativeDate(isoDate, locale?): string // "2 days ago" via Intl.RelativeTimeFormat
}

function getVisibleTags(tags, count=3): { visible, extra }
function countTagFrequency(videos): Record<string, number>
```

---

### Storage (`utils/loadFromStorage.ts`, `utils/storageKeys.ts`)

```typescript
// Todas as chaves centralizadas
const STORAGE_KEYS = {
  WATCH_HISTORY, LIKED_VIDEOS, DISLIKED_VIDEOS, SAVED_VIDEOS,
  VIDEO_PROGRESS, AUTOPLAY, WATCH_EVENTS, PINNED_VIDEO,
  SHORTS_MUTED, SHORTS_VOLUME,
  THEME_MODE, THEME_COLOR, LANGUAGE,
  RECENT_SEARCHES, SUBSCRIPTIONS, PLAYLISTS
}

// Leitura segura com fallback
function loadFromStorage<T>(key, seed, validate?): T
  // JSON.parse + validação opcional
  // Se inválido ou ausente → grava seed e retorna seed
  // Nunca lança exceção

// Helpers de validação
function isObject(v): boolean
function isArray(v): boolean
function isNumberInRange(min, max): (v) => boolean
```

---

### Player Hooks

**`usePlayerControls`** — gerencia visibilidade dos controles (esconde após 3s de inatividade).

**`usePlayerKeyboard`** — keyboard shortcuts do player. Ignora eventos em `input`/`textarea`.

**`usePlayerPlayback`** — rastreia `isPlaying`, `duration`, `currentTime`, `volume`, `bufferedPct`, `playbackRate`. Expõe handlers para eventos do `<video>`.

**`useVideoProgress`**:
- Throttle 3s para persistir progresso
- Simula progresso se vídeo sem arquivo (60s fake, +2s por tick)
- Ao unmount: abre MiniPlayer se não finalizado
- Consome `pendingVideoSeek` ao `loadedMetadata`

---

### UI Hooks

| Hook | Comportamento |
|------|---------------|
| `useAutoplay` | Countdown 5s ao finalizar; navega para próximo related |
| `useBurstAnimation(duration)` | `[animating, trigger]` — ativa por N ms |
| `useClickOutside(ref, cb, enabled)` | mousedown fora do ref |
| `useDebounce(value, delay)` | valor estável após delay ms |
| `useInView({ threshold, rootMargin, once })` | IntersectionObserver + sync check via `getBoundingClientRect` |
| `useMediaQuery(query)` | boolean reativo para media query |

---

## API Layer

### `src/api/client.ts`

Axios instance com:
- Base URL do backend
- `withCredentials: true` (Sanctum sessions)
- Error interceptors

### `src/api/videos.ts`

```typescript
fetchVideos(params?): Promise<VideoListResponse>
fetchVideo(id): Promise<Video>
uploadVideo(payload): Promise<Video>
updateVideo(id, payload): Promise<Video>
deleteVideo(id): Promise<void>
```

> **⚠ Não conectado:** Atualmente não há chamadas de API reais. O Redux usa mock data diretamente. Estas funções existem mas não são chamadas.

---

## Dados Mock

### `mockVideos.ts`

```typescript
enum VideoStatus { PUBLISHED = 'published', SCHEDULED = 'scheduled' }

interface Video {
  id, title, description, tags, thumbnail, publishedAt,
  scheduledAt?, channel, channelId, views, status,
  duration?, videoUrl?   // Links reais do Google Storage (CC-licensed)
}
```

20+ vídeos organizados por canal (ch_1 a ch_15).

### `mockPlaylists.ts`

```typescript
const MOCK_PLAYLISTS = [
  { id: 'pl_1', name: 'Frontend Essentials', videoIds: [...] },
  { id: 'pl_2', name: 'Design & CSS', videoIds: [...] },
  { id: 'pl_3', name: 'Algorithms & APIs', videoIds: [...] }
]
```

### `themeConfig.ts`

```typescript
const THEME_COLORS = [
  { key: 'violet', hex: '#7c3aed', label: 'Violet' },
  { key: 'blue',   hex: '#2563eb', label: 'Blue' },
  { key: 'green',  hex: '#059669', label: 'Green' },
  { key: 'rose',   hex: '#e11d48', label: 'Rose' },
  { key: 'amber',  hex: '#d97706', label: 'Amber' },
]

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
]
```

---

## i18n

Configuração: `src/i18n/index.ts` — i18next + react-i18next, idiomas EN/PT, interpolação com `{{var}}`, pluralização `_one`/`_other`.

### Chaves por namespace

| Seção | Chaves relevantes |
|-------|-------------------|
| `common` | app_name, loading, sign_out, cancel, save, back, close, remove, not_found_title, go_home |
| `auth` | sign_in, email, password, invalid_credentials, session_expired |
| `preferences` | title, theme, dark, light, accent_color, language, autoplay |
| `header` | create, notifications, searchPlaceholder, recentSearches, removeRecent |
| `video` | upload, filters, sort_*, like, liked, dislike, disliked, save, saved, share, watch_history, edit, delete, publish, upload_title (50+ chaves) |
| `nav` | home, shorts, history, playlists, watch_later, liked_videos, your_videos, subscriptions |
| `shorts` | empty_title, empty_desc, mute, unmute, counter, volume, description |
| `tag` | title, fromThisVideo, otherVideos, add_placeholder, remove_tag |
| `home` | trending, continue_watching, surprise_me, empty_title, filtered_action |
| `history` | group_today, group_yesterday, group_this_week, group_older, clear_all, remove, period_label |
| `search` | try_different, placeholder, go, submit |
| `channel` | not_found, since, subscribe, subscribed, most_watched |
| `shortcuts` | title, global, video_page, focus_search, open_upload, like, save, theater_mode |
| `toast` | liked, unliked, saved, unsaved, history_removed, history_cleared, video_uploaded, link_copied, subscribed, unsubscribed, playlist_created, added_to_playlist, removed_from_playlist |
| `profile` | videos_watched, watch_time, liked_count, saved_count, top_tags, streak, edit_profile, bio_placeholder, delete_confirm, heatmap_14d, heatmap_30d |
| `playlist` | empty_title, new, name_placeholder, create, rename, delete, delete_confirm, save_to, watch_later_row, videos_count_one, videos_count_other, remove_video |
| `mini_player` | label, play, pause, expand, drag |

---

## Testes

### `applyFilters.test.ts` — 40+ casos

- `emptyState()` — tipo de retorno correto
- `apply()` — sem filtro, tag filter (AND), year, date range, sort
- Edge cases: array vazio, nenhum match, imutabilidade

### `videoSlice.test.ts`

- `deleteVideo()` — remove de videos, history, liked, disliked, saved, watchEvents, pinned
- `likeVideo()` — toggle, cross-remove com disliked
- `dislikeVideo()` — toggle, cross-remove com liked
- `saveVideo()` — toggle
- `watchVideo()` — move para frente de history, cria event

### `format.test.ts`

Cobre `Format.duration`, `Format.views`, `Format.relativeDate`.

### `playlistSlice.test.ts`

Cobre CRUD de playlists, add/remove vídeos, reorder, cascade delete.

### Cobertura atual

✅ Core logic (slices, filters, format)
❌ Componentes React (sem @testing-library)
❌ Hooks complexos (player, progress)
❌ Integração de fluxos completos

---

## CSS & Estilos

### Convenção de nomenclatura

BEM-like: `bloco__elemento--modificador`

Exemplos: `app-header__search-input`, `video-card--with-actions`, `filter-panel__filters`

### CSS Variables (`src/styles/base.css`)

Definidas por `[data-mode]` e `[data-color]`:

```css
--accent          /* cor de acento (violet, blue, green, rose, amber) */
--surface         /* background principal */
--surface-2       /* background secundário */
--surface-3       /* background terciário */
--border          /* cor de borda */
--text            /* texto primário */
--text-2          /* texto secundário */
--text-3          /* texto terciário */
--radius-sm       /* border radius pequeno */
--radius-md       /* border radius médio */
```

### Tema aplicado

`persistMiddleware` grava theme no `document.documentElement.dataset.mode` e `.dataset.color` em flush imediato (0ms debounce). `public/theme-init.js` previne FOUC lendo localStorage antes do React montar.

### Animações (`src/styles/animations.css`)

Keyframes reutilizáveis: fade in/out, slide in/out, scale, rotation, burst (para likes).

---

## Roteamento

`src/App.tsx`:

```
<Provider store>
  <BrowserRouter>
    <AppInit>                        — fetch do user, session expiry, crossTabSync
      <SearchProvider>               — ref do input de busca
        <TooltipProvider>
          <Suspense>
            <UploadModal>            — lazy, fora do layout
          </Suspense>
          <RouteErrorBoundary>
            <Routes>
              <Route /login>
              <Route element={<Guard><AppLayout /></Guard>}>
                /             → HomePage
                /shorts       → ShortsPage
                /history      → HistoryPage
                /playlists    → PlaylistsPage
                /watch-later  → WatchLaterPage
                /liked        → LikedPage
                /profile      → ProfilePage
                /user/:id     → ProfilePage (alheio)
                /video/:id    → VideoPage
                /search       → SearchPage
                /channel/:id  → ChannelPage
              <Route path="*" → NotFoundPage
```

**Lazy loading:** Todas as páginas com `React.lazy()` para code splitting.

**AppInit:** `useEffect` que:
1. Dispatch `fetchMe()` — verifica sessão ativa
2. Escuta `APP_EVENTS.SESSION_EXPIRED` — logout forçado
3. Inicia `initCrossTabSync()` — sync de tema entre abas
4. Escuta `visibilitychange` para classe `page-hidden` no body

---

## Problemas & Gaps

### Implementado mas não conectado ao backend

- **API Layer** — `src/api/videos.ts` tem todas as funções mas nenhuma é chamada. Redux usa mock data.
- **Auth** — `authSlice` e `useAuth` existem mas o fluxo real de login (Sanctum) não está sendo exercido.
- **Upload** — `UploadModal` tem form completo mas sem chamada real à API.

### Implementado mas incompleto

- **`localStorageMiddleware.ts`** — middleware alternativo de persistência não está em uso. Candidato a remoção.
- **`useVideoProgress` simulado** — vídeos sem `videoUrl` usam progresso fictício (60s fake). Funciona para demo mas não reflete playback real.
- **Cross-tab sync parcial** — apenas tema é sincronizado. Playlists, histórico e curtidas não sincronizam entre abas.
- **Error handling** — sem tratamento robusto de erros de rede nos fetches.

### Sem testes

- Nenhum teste de componente React (precisaria de `@testing-library/react`)
- Hooks complexos sem cobertura: `usePlayerPlayback`, `useVideoProgress`, `useAutoplay`
- Fluxos de integração: mini player → video page → resume

### Problemas de performance potenciais

- **`makeSelectRecommendations`** — recalculado a cada render da página. Considerar `useMemo` no nível do componente ou selector memoizado com `createSelector`.
- **VideoPlayer ~500 linhas** — componente grande. Difícil de testar e manter. Candidato a extração de subcomponentes.
- **Sem React.memo estratégico** — ShortItem é memoizado, mas VideoCard e VideoRow podem se beneficiar em grids grandes.

### Acessibilidade

- Faltam ARIA labels em botões de ícone (only icon, sem texto visível)
- Alguns dropdowns não seguem WAI-ARIA completamente
- Focus management ao abrir/fechar modais poderia ser mais robusto

---

## O que implementar a seguir

### Alta prioridade (funcionalidade core)

1. **Conectar API Layer** — substituir mock data por chamadas reais ao backend Laravel. Implementar loading states e error boundaries nos fetches.
2. **Auth flow completo** — login/logout via Sanctum, redirecionamento pós-login, tratamento de 401/419.
3. **Upload real** — `UploadModal` → `api/videos.ts` → backend. Progress de upload.

### Média prioridade (UX)

4. **Skeleton states** — `pageSkeleton.tsx` existe mas precisa ser aplicado em todas as páginas durante fetch.
5. **Cross-tab sync completo** — sincronizar playlists e curtidas além do tema.
6. **Error boundaries granulares** — além do global, em sections críticas (player, playlists).
7. **Mobile responsiveness** — revisar grids, sidebar e player em telas pequenas.

### Baixa prioridade (qualidade)

8. **Remover `localStorageMiddleware.ts`** — arquivo legado não utilizado.
9. **Quebrar VideoPlayer** — extrair `<PlayerControls>`, `<PlayerScrubber>`, `<PlayerSettings>` como subcomponentes.
10. **Testes de componentes** — instalar `@testing-library/react` e cobrir VideoCard, FilterPanel, usePlayerPlayback.
11. **ARIA melhorado** — adicionar `aria-label` em botões de ícone, `role` em elementos interativos customizados.
12. **Image optimization** — lazy load, srcset, WebP para thumbnails quando backend for conectado.

---

*Fim da análise — atualizar este arquivo conforme o projeto evolui.*
