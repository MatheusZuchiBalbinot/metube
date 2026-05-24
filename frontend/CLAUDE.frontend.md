# Frontend — Guia Completo

Stack: **React 19 + TypeScript 5.9 + Vite 7 + Redux Toolkit + React Router v7 + Tailwind CSS**

---

## Workflow obrigatório após qualquer mudança

```bash
npx tsc --noEmit        # type check — deve passar sem erros
npm run lint            # ESLint — deve passar sem erros (warnings OK em CI)
npx vitest run          # testes — todos devem passar
```

CI rejeita PRs com erros de TypeScript, erros de lint, ou testes falhando.

---

## Estrutura de arquivos

```
src/
  App.tsx                     # Roteamento, providers, AppInit (bootstrap + realtime)
  main.tsx                    # Entry point
  app.css                     # Estilos globais de nível app

  api/                        # Clientes HTTP por domínio — nunca use axios diretamente nos componentes
    client.ts                 # ApiClient base — todos os métodos retornam ApiResult<T>: { ok: true; data: T } | { ok: false; error: string }
    analytics.ts              # AnalyticsApi  → /analytics/*
    auth.ts                   # AuthApi       → /sessions, /users, /password-resets
    channels.ts               # ChannelApi    → /channels/*
    comments.ts               # CommentsApi   → /videos/:vuid/comments, /comments/:cuid
    history.ts                # HistoryApi    → /users/me/history, /users/me/progress
    interactions.ts           # InteractionsApi → /users/me/likes, /users/me/saved
    notifications.ts          # NotificationsApi → /notifications/*
    playlists.ts              # PlaylistApi   → /playlists/*
    videos.ts                 # VideoApi      → /videos/*
    index.ts                  # barrel: re-exporta instâncias + tipos públicos

  components/
    auth/
      verificationBanner.tsx  # Banner de verificação de e-mail
    comment/
      form.tsx                # Formulário de novo comentário / edição
      history.tsx             # Histórico de versões de um comentário
      item.tsx                # Item individual de comentário (com ações)
      replies.tsx             # Lista de respostas aninhadas
      section.tsx             # Seção completa de comentários (lista + form)
    error/
      boundary.tsx            # ErrorBoundary com BoundaryLevel (page/section/widget)
    filter/
      panel.tsx               # FilterPanel — barra horizontal de filtros acima do grid
    guard/
      guard.tsx               # Guard — protege rotas autenticadas
    header/
      header.tsx              # AppHeader — barra de topo
    layout/
      layout.tsx              # Shell: header + sidebar + <Outlet>
      pageSkeleton.tsx        # Skeleton por rota
    mini/
      player.tsx              # Mini-player flutuante (picture-in-layout)
    notifications/
      bell.tsx                # Ícone com badge de não-lidas
      item.tsx                # Item individual de notificação
      panel.tsx               # Painel dropdown de notificações
    player/
      player.tsx              # Orquestrador do player (roteador: default/mini/short)
      playerDefault.tsx       # Player principal (desktop/vídeo completo)
      playerControlsBar.tsx   # Barra de controles: play, volume, tempo, legendas, PiP, teatro, fullscreen
      playerMini.tsx          # Player mini (dentro do mini/player.tsx)
      playerShort.tsx         # Player de shorts (scroll vertical)
      playerOverlays.tsx      # Overlays: buffering, pop icon, skip indicator
      playerSeekBar.tsx       # Seek bar com preview de thumbnail
      playerSettings.tsx      # Painel de velocidade / qualidade
      captionsButton.tsx      # Botão de legendas
      pipButton.tsx           # Botão Picture-in-Picture
      theaterButton.tsx       # Botão de modo teatro
      playerTypes.ts          # Tipos compartilhados entre subcomponentes do player
    playlist/
      card.tsx                # PlaylistCard
    preferences/
      preferences.tsx         # Painel de preferências (tema, idioma, etc.)
    shortcuts/
      modal.tsx               # Modal de atalhos de teclado
    sidebar/
      sidebar.tsx             # Navegação lateral
    tag/
      badge.tsx               # TagBadge (exibe tag com cor)
      input.tsx               # TagInput (campo de entrada de tags)
      view.tsx                # TagView (exibe tags de um vídeo)
    upload/
      modal.tsx               # UploadModal — lazy-loaded globalmente no App.tsx
      uploadPreview.tsx        # Tira-teaser de thumbnail + preview de vídeo (sub-componente do modal)
      batchItemRow.tsx         # Linha de item no modo batch (sub-componente do modal)
    video/
      actionCard.tsx          # VideoActionCard (ações: like/dislike/save/share)
      card.tsx                # VideoCard — thumbnail + metadados
      cardSkeleton.tsx        # VideoCardSkeleton — placeholder de loading
      hero.tsx                # VideoHero — banner de destaque
      reactionBtn.tsx         # ReactionButton (like/dislike/save com animação)
      readingMode.tsx         # ReadingMode — transcrição/modo leitura
      row.tsx                 # VideoRow — listagem horizontal
      rowSkeleton.tsx         # VideoRowSkeleton
      savePopover.tsx         # SavePopover — adicionar a playlist
      statusBadges.tsx        # VideoStatusBadges (processing/scheduled/draft/failed)
    ui/                       # Primitivos reutilizáveis (@ui) — verifique aqui antes de criar elementos
      avatar/avatar.tsx       # Avatar com iniciais ou imagem (sm/md/lg)
      badge/badge.tsx         # Badge de status/categoria
      button/button.tsx       # Button — NUNCA use <button> raw
      card/card.tsx           # Card container
      carouselNav/carouselNav.tsx # Navegação de carrossel
      checkbox/checkbox.tsx   # Checkbox customizado
      date/picker.tsx         # DatePicker com popover
      date/calendar.tsx       # Calendário (usado pelo DatePicker)
      dnd/dnd.tsx             # Área drag-and-drop
      dropdown/dropdown.tsx   # Select customizado
      empty/empty.tsx         # Estado vazio com ícone e mensagem
      input/input.tsx         # Input com icon/label/error/helper
      modal/modal.tsx         # Modal com focus trap
      navProgress/navProgress.tsx # Barra de progresso de navegação
      pageLoader/pageLoader.tsx   # Loading de página inteira
      skeleton/skeleton.tsx   # Placeholder de loading
      spinner/spinner.tsx     # Indicador de carregamento
      toast/toast.tsx         # Notificações temporárias (via toastSlice)
      tooltip/tooltip.tsx     # Tooltip acessível (Radix)
      index.ts                # Barrel — importe como `import { Button } from '@ui'`

  context/
    searchContext.tsx         # SearchProvider — estado de busca com debounce
    search.ts                 # Tipo SearchState
    useSearch.ts              # Hook para consumir SearchContext
    index.ts                  # barrel

  data/
    themeConfig.ts            # Configurações de tema (cores, modos disponíveis)

  enums/                      # Enums TypeScript (ver seção Enums abaixo)
    barState.ts               # BarState: IDLE | LOADING | DONE
    boundaryLevel.ts          # BoundaryLevel: PAGE | SECTION | WIDGET
    historyItemKind.ts        # HistoryItemKind: HEADER | VIDEO
    notificationType.ts       # NotificationType (espelha o backend)
    popIconType.ts            # PopIconType: PLAY | PAUSE
    quickRangeKind.ts         # QuickRangeKind (seletor de intervalo no DatePicker)
    reactionType.ts           # ReactionType: LIKE | DISLIKE
    sidebarTab.ts             # SidebarTab: RELATED | SUMMARY
    skipDirection.ts          # SkipDirection: FWD | BWD
    suggestionKind.ts         # SuggestionKind (autocomplete de busca)
    toastType.ts              # ToastType: SUCCESS | ERROR | INFO
    uploadMode.ts             # UploadMode: SINGLE | BATCH
    uploadStatus.ts           # UploadStatus: IDLE | UPLOADING | DONE | ERROR

  hooks/                      # Custom hooks (ver seção Hooks abaixo)

  i18n/
    index.ts                  # Configuração i18next
    locales/en.json           # Textos em inglês
    locales/pt.json           # Textos em português

  lib/
    echo.ts                   # Singleton Laravel Echo (Reverb/WebSocket) com authorizer axios

  pages/
    channel/
      channel.tsx             # Página de canal
      components/             # Sub-componentes locais da página
        ChannelCoverStory.tsx  # Capa em destaque com comentários em spotlight
        ChannelDiamondTiers.tsx # Top vídeos em grade diamante
        ChannelTopicGrid.tsx   # Grade de tópicos por tag
    forgotPassword/forgotPassword.tsx
    history/history.tsx       # Histórico de vídeos assistidos (com filtro de período)
    home/home.tsx             # Feed principal
    liked/liked.tsx           # Vídeos curtidos
    login/login.tsx           # Login
    notFound/notFound.tsx     # 404
    playlists/playlists.tsx   # Listagem de playlists
    profile/
      profile.tsx             # Perfil do usuário (próprio ou alheio)
      hooks/                  # Hooks locais da página
        useDeleteVideoModal.ts
        useEditProfileModal.ts
        useEditVideoModal.ts
        useProfileSections.ts  # → ProfileSectionsData | null (curated layout ≥8 vídeos)
        useProfileStats.ts     # → ProfileStats | null (apenas próprio perfil)
        useSpotlightComments.ts
      components/             # Sub-componentes locais da página
        DeleteVideoModal.tsx
        EditProfileModal.tsx
        EditVideoModal.tsx
        ProfileCoverStory.tsx
        ProfileDiamondTiers.tsx
        ProfileSections.tsx
        ProfileStats.tsx
        ProfileTopicGrid.tsx
        ProfileVideoGrid.tsx
    resetPassword/resetPassword.tsx
    search/search.tsx         # Resultados de busca (?q=)
    shorts/
      shorts.tsx              # Feed de shorts (scroll vertical)
      hooks/
        useShortPanels.ts      # Estado dos painéis (volume slider, description)
        useShortReactions.ts   # Like/dislike + animações burst por short
        useShortsFeedObserver.ts # IntersectionObserver que detecta o short ativo
        useShortsData.ts       # Filtra shorts + fecha mini-player ao montar
        useShortsNavigation.ts # renderedIndex, activateIndex, scrollToIndex
        useShortsRefs.ts       # Unifica itemRefs, videoMap e videoRefs
      components/
        VolumeIcon.tsx         # Ícone de volume declarativo (VolumeX / Volume1 / Volume2)
    signup/signup.tsx         # Cadastro
    video/
      video.tsx               # Página de vídeo (/watch?v=vuid)
      hooks/                  # Hooks locais da página
        useSkipAnalytics.ts
        useVideoReactions.ts
        useVideoSave.ts
        useVideoShare.ts
        useViewTracking.ts
      components/             # Sub-componentes locais da página
        AutoplayBanner.tsx
        ShareMenu.tsx
        VideoFallback.tsx
        VideoInfo.tsx
        VideoNotFound.tsx
        VideoPlayerArea.tsx
        VideoProcessingScreen.tsx
        VideoSidebar.tsx
    watch/later.tsx           # Watch Later

  store/                      # Redux Toolkit (ver seção Redux abaixo)
    authSlice.ts
    commentSlice.ts
    crossTabSync.ts           # Sync de estado entre abas via `storage` events
    index.ts                  # configureStore + useAppDispatch/useAppSelector
    notificationsSlice.ts
    persistMiddleware.ts      # Persiste slices selecionados no localStorage
    playlistSlice.ts
    reducers.ts               # rootReducer (combineReducers)
    searchSlice.ts
    subscriptionSlice.ts
    themeSlice.ts
    toastSlice.ts
    types.ts                  # RootState e AppDispatch (isolado para quebrar circular dep)
    videoSelectors.ts         # Selectors memoizados (selectRecommendations, selectPublishedVideos, etc.)
    videoSlice.ts

  styles/
    base.css                  # Design tokens globais (cores, espaçamento, raios, layout)
    animations.css            # Keyframes globais
    tailwind.css              # Diretivas Tailwind

  types/                      # DTOs de domínio (@models)
    channel.ts                # Channel, ChannelId, Uuid
    comment.ts                # Comment, CommentAuthor, CommentVersion, Cuid
    common.ts                 # PaginatedResponse, PaginatedMeta
    history.ts                # WatchHistoryEntry, HistoryPeriod
    index.ts                  # barrel
    playlist.ts               # Playlist, Puid
    reaction.ts               # Reaction
    tag.ts                    # Tag (string brand)
    user.ts                   # User, Uuid
    video.ts                  # Video, VideoId, VideoStatus, VideoCaption

  utils/
    index.ts                  # Barrel — re-exporta todos os utils; importe de `@utils`
    applyFilters.ts           # Aplica filtros locais à lista de vídeos
    cn.ts                     # Combina classnames (clsx-like)
    dom.ts                    # Helpers de DOM
    events.ts                 # APP_EVENTS: SESSION_EXPIRED | FORBIDDEN | SERVICE_UNAVAILABLE
    format.ts                 # Format.views / Format.duration / getVisibleTags / countTagFrequency
    impressionBatcher.ts      # Acumula impressões e flush em batch (1s debounce, max 50)
    loadFromStorage.ts        # loadFromStorage + type guards (isArray, isObject, isNumberInRange)
    logger.ts                 # Logger com níveis (dev-only)
    mergeProgress.ts          # Mescla progresso local com dados do servidor
    notificationSound.ts      # Som de notificação
    parse.ts                  # Parsers de resposta da API
    routes.ts                 # ROUTES const + videoUrl() helper
    sessionId.ts              # Gera/persiste session ID de analytics
    storageKeys.ts            # STORAGE_KEYS — todas as chaves de localStorage
    tagColors.ts              # Mapeia tags para cores
    themeRipple.ts            # Efeito ripple na troca de tema
    themes.ts                 # Definições de temas
    time.ts                   # formatDuration, formatDurationCompact, formatRelativeDate, formatEta, parseTimestamp, secondsToTimestamp, parseChapterTimestamp
    upload.ts                 # UploadProgress interface + buildProgress()
    validate.ts               # Helpers de validação de formulário
    viewedVideos.ts           # Rastreia vídeos visualizados na sessão

  api/
    parsers.ts                # Parse functions: snake_case → camelCase transforms for all API responses

tests/                        # Vitest — espelha src/
  api/
  components/
  domain/                     # Testes unitários de todos os módulos domain
  hooks/
  store/
  utils/
```

---

## Aliases de importação

| Alias           | Aponta para                   |
|-----------------|-------------------------------|
| `@api`          | `src/api` (barrel)            |
| `@context/*`    | `src/context/*`               |
| `@components/*` | `src/components/*`            |
| `@ui`           | `src/components/ui` (barrel)  |
| `@ui/*`         | `src/components/ui/*`         |
| `@pages/*`      | `src/pages/*`                 |
| `@styles/*`     | `src/styles/*`                |
| `@data/*`       | `src/data/*`                  |
| `@utils`        | `src/utils/index.ts` (barrel) |
| `@utils/*`      | `src/utils/*`                 |
| `@hooks`        | `src/hooks/index.ts` (barrel) |
| `@hooks/*`      | `src/hooks/*`                 |
| `@store`        | `src/store` (barrel)          |
| `@store/*`      | `src/store/*`                 |
| `@domain`       | `src/domain/index.ts`         |
| `@domain/*`     | `src/domain/*`                |
| `@models`       | `src/types/index.ts` (barrel) |
| `@models/*`     | `src/types/*`                 |
| `@lib/*`        | `src/lib/*`                   |
| `@enums/*`      | `src/enums/*`                 |
| `@validation`   | `src/validation` (barrel)     |
| `@validation/*` | `src/validation/*`            |

**Exceção crítica**: dentro de `src/components/ui/`, use caminho relativo (`../button/button`). Usar `@ui` dentro de `ui/` cria dependência circular com o barrel.

---

## Rotas

Definidas em `src/utils/routes.ts` como `ROUTES`. **Nunca use strings literais de rota.**

```
/login              → LoginPage           (pública)
/signup             → SignupPage           (pública)
/forgot-password    → ForgotPasswordPage  (pública)
/reset-password/:token → ResetPasswordPage (pública)
/                   → HomePage            (protegida)
/shorts             → ShortsPage          (protegida)
/history            → HistoryPage         (protegida)
/playlists          → PlaylistsPage       (protegida)
/watch-later        → WatchLaterPage      (protegida)
/liked              → LikedPage           (protegida)
/profile            → ProfilePage         (protegida, próprio usuário)
/user/:id           → ProfilePage         (protegida, outro usuário)
/watch              → VideoPage           (protegida, ?v=vuid)
/search             → SearchPage          (protegida, ?q=)
/channel/:id        → ChannelPage         (protegida)
*                   → NotFoundPage
```

Todas as rotas protegidas são envolvidas por `<Guard><AppLayout />`. `UploadModal` é lazy-loaded globalmente (fora do router) em `App.tsx` — disponível em qualquer rota.

---

## API Client

Cada domínio tem uma classe com `baseUrl` privado. **Nunca use axios ou fetch diretamente nos componentes/hooks** — use as classes em `src/api/`.

```ts
import { video, auth, playlist, channel, history, interactions, comments, analytics, notifications } from '@api';

// Vídeos
await video.list({ page: 1, tags: ['react'] });
await video.get(vuid);
await video.create(payload);       // retorna Video (status 202 — ainda processing)
await video.toggleLike(vuid);
await video.getSummary(vuid);

// Auth
await auth.login({ email, password });
await auth.me();
await auth.updateProfile({ name, bio });

// Playlists
await playlist.list();
await playlist.addVideo(puid, vuid);
await playlist.reorder(puid, [vuid1, vuid2]);

// Comentários
await comments.list(vuid, { page });
await comments.create(vuid, { content, parentCuid });
await comments.toggleLike(cuid);
await comments.replies(cuid);
await comments.versions(cuid);

// Analytics
await analytics.impressions({ vuids, source, sessionId });
await analytics.click({ vuid, source, position });
await analytics.search({ query, resultCount });
await analytics.skip({ vuid, percent });

// Notificações
await notifications.list(page);
await notifications.unreadCount();
await notifications.markRead(id);
await notifications.markAllRead();
await notifications.remove(id);
```

Todos os métodos de `ApiClient` retornam `ApiResult<T>`:

```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const result = await video.list();
if (result.ok) {
    // result.data é T
}
```

Respostas são parseadas por funções em `src/api/parsers.ts` antes de chegar ao store. Cada função faz a transformação snake_case → camelCase e retorna `T | null`.

---

## Domain

Lógica de domínio pura (sem efeitos colaterais) fica em `src/domain/`. Exposta como um único objeto `domain` via barrel:

```ts
import { domain } from '@domain';

domain.video.isPublished(v)
domain.video.isProcessing(v)
domain.video.isVisible(v)
domain.playlist.isWatchLater(p)
domain.comment.canEdit(comment, user)
domain.transcription.isCompleted(t)
domain.aiSuggestion.isPending(s)
domain.user.isVerified(u)
```

Cada módulo (`domain/video.ts`, `domain/playlist.ts`, etc.) exporta um objeto de mesmo nome com as funções — as funções em si são privadas ao módulo. **Nunca importe funções individuais de `@domain/video`** — use sempre `{ domain } from '@domain'`.

---

## Redux Slices

| Slice                | State key         | Responsabilidade                                                              |
|----------------------|-------------------|-------------------------------------------------------------------------------|
| `videoSlice`         | `video`           | lista de vídeos, watchHistory, likes/dislikes/saves, progress, miniPlayer, teatro, shorts, uploadModal |
| `authSlice`          | `auth`            | usuário autenticado, estado de sessão                                         |
| `themeSlice`         | `theme`           | modo (dark/light) + cor de acento                                             |
| `toastSlice`         | `toast`           | notificações temporárias (max 3 simultâneas)                                  |
| `playlistSlice`      | `playlist`        | playlists com videoIds, drag-and-drop                                         |
| `subscriptionSlice`  | `subscription`    | inscrições em canais                                                          |
| `searchSlice`        | `search`          | buscas recentes (max 5, dedup por lowercase)                                  |
| `commentSlice`       | `comment`         | comentários por vídeo (byId/byVideo), respostas, paginação, loading           |
| `notificationsSlice` | `notifications`   | itens, unreadCount, hasMore, loading                                          |

### Persistência e sync
- `persistMiddleware` — persiste slices selecionados no `localStorage` (chaves em `STORAGE_KEYS`)
- `crossTabSync.ts` — escuta eventos `storage` para sincronizar estado entre abas
- Hooks tipados: `useAppDispatch()`, `useAppSelector()` (importados de `@store`)

### Selectors memoizados (`videoSelectors.ts`)
- `selectPublishedVideos` — filtra vídeos publicados (inclui scheduled passado)
- `selectHistoryTags` — extrai tags dos vídeos assistidos
- `selectLikedSet` / `selectDislikedSet` — sets para lookup O(1)
- `selectRecommendations` / `makeSelectRecommendations(limit)` — score por afinidade de tags + views

---

## Hooks

| Hook                     | Uso                                                                     |
|--------------------------|-------------------------------------------------------------------------|
| `useAuth`                | autenticação, usuário logado, login/logout                              |
| `useBootstrap`           | popula Redux do backend após login (chamado uma vez no AppInit)         |
| `useRealtime`            | conecta Laravel Echo; escuta notificações e VideoStatusUpdated do canal privado do usuário |
| `useVideo`               | CRUD de vídeo, filtros, progresso, miniPlayer                           |
| `useComments`            | lista, cria, edita, deleta, likes de comentários; gerencia respostas    |
| `usePlaylist`            | CRUD de playlists (sincroniza com API)                                  |
| `useSubscription`        | toggle de inscrição em canal                                            |
| `useShaka`               | setup de streaming via Shaka Player (HLS, DASH, MP4)                   |
| `usePlayerKeyboard`      | atalhos de teclado do player                                            |
| `usePlayerControls`      | visibilidade dos controles do player                                    |
| `usePlayerPlayback`      | estado de play/pause/seek/volume                                        |
| `usePlayerCaptions`      | estado e seleção de legenda                                             |
| `useVideoProgress`       | tracking de progresso + persist                                         |
| `useVideoProcessingPoll` | polling de vídeos com status=processing até resolverem                  |
| `useTusUpload`           | upload resumável via tus-js-client (pause/resume, progress, retry)      |
| `useUpload`              | upload direto via axios com progresso                                   |
| `useFilterState`         | estado do painel de filtros                                             |
| `useAutoplay`            | lógica de autoplay                                                      |
| `usePopIcon`             | animação de ícone pop (play/pause feedback)                             |
| `useSkipIndicator`       | indicador de skip (+10s/-10s)                                           |
| `useBurstAnimation`      | animação burst em reações (like/dislike)                                |
| `useFullscreen`          | toggle de fullscreen                                                    |
| `usePictureInPicture`    | toggle de Picture-in-Picture                                            |
| `useVolumeWheel`         | scroll da roda do mouse para ajustar volume                             |
| `useClickDoubleClick`    | distingue click simples de double-click                                 |
| `useClickOutside`        | detecta click fora de um elemento                                       |
| `useOutsideClick`        | alias/variante de useClickOutside                                       |
| `useKeyboardShortcuts`   | atalhos globais de teclado                                              |
| `useTrackImpression`     | Intersection Observer para registrar impressões de vídeo                |
| `useScrollRestoration`   | restaura posição de scroll ao navegar                                   |
| `useTheme`               | lê/aplica tema (modo + cor de acento)                                   |
| `useDebounce`            | debounce de valor                                                       |
| `useInView`              | Intersection Observer para lazy loading                                 |
| `useMediaQuery`          | detecta breakpoints (ex: isMobile)                                      |

---

## Enums

| Enum               | Valores                                                              |
|--------------------|----------------------------------------------------------------------|
| `BarState`         | `IDLE`, `LOADING`, `DONE`                                            |
| `BoundaryLevel`    | `PAGE`, `SECTION`, `WIDGET`                                          |
| `HistoryItemKind`  | `HEADER`, `VIDEO`                                                    |
| `NotificationType` | `COMMENT_REPLIED`, `COMMENT_LIKED`, `VIDEO_LIKED`, `NEW_SUBSCRIBER`, `VIDEO_FROM_SUBSCRIPTION` |
| `PopIconType`      | `PLAY`, `PAUSE`                                                      |
| `ReactionType`     | `LIKE`, `DISLIKE`                                                    |
| `SidebarTab`       | `RELATED`, `SUMMARY`                                                 |
| `SkipDirection`    | `FWD`, `BWD`                                                         |
| `ToastType`        | `SUCCESS`, `ERROR`, `INFO`                                           |
| `UploadMode`       | `SINGLE`, `BATCH`                                                    |
| `UploadStatus`     | `IDLE`, `UPLOADING`, `DONE`, `ERROR`                                 |

---

## Identificadores tipados (`src/types/`)

```ts
type VideoId   = string & { readonly _brand: 'VideoId' }   // id local Redux (vuid da API)
type Vuid      = string & { readonly _brand: 'Vuid' }       // id de vídeo na API
type Cuid      = string & { readonly _brand: 'Cuid' }       // id de comentário
type ChannelId = string & { readonly _brand: 'ChannelId' }  // uuid do canal
type Puid      = string & { readonly _brand: 'Puid' }       // id de playlist
type Uuid      = string & { readonly _brand: 'Uuid' }       // id de usuário
```

Use type casts explícitos ao construir mocks: `'v-test' as unknown as VideoId`.

---

## Realtime (Laravel Echo + Reverb)

Configurado em `src/lib/echo.ts` como singleton lazy. Inicializado por `useRealtime` no `AppInit`.

```ts
import getEcho, { destroyEcho } from '@lib/echo';
const echo = getEcho();  // null se VITE_REVERB_APP_KEY não estiver configurado
```

**Authorizer customizado**: usa `axios.post('/api/broadcasting/auth', ...)` em vez do XHR nativo do Pusher para que o `X-XSRF-TOKEN` seja enviado automaticamente (o XHR nativo não lê o cookie, causando 419 CSRF).

Variáveis de ambiente necessárias:
```
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

Canais escutados por `useRealtime`:
- `users.{uuid}` (privado) → notificações + `VideoStatusUpdated`

---

## Upload de vídeo

### Fluxo tus resumável (`useTusUpload`)

```ts
const { uploadFile, progress, status, pause, resume, reset } = useTusUpload();

const result = await uploadFile(file);  // retorna { uploadKey } ou null
// Depois:
await video.create({ uploadKey: result.uploadKey, title, ... });
```

- Chunk size: **5 MB**
- Retries: `[0, 1s, 3s, 5s, 10s]`
- Suporta resumo de uploads anteriores (`findPreviousUploads`)
- `UploadProgress` inclui: `percent`, `speed` (bytes/s), `remaining` (segundos estimados)

### Modo batch (UploadModal)
O `UploadModal` tem dois modos (`UploadMode`):
- `SINGLE` — usa `useTusUpload` (padrão)
- `BATCH` — usa `uploadViaTus` (função standalone que cria instâncias `tus.Upload` independentes, permitindo uploads em paralelo via `Promise.all`)

---

## Primitivos de UI (`@ui`)

**Antes de criar qualquer elemento interativo, verifique se já existe em `src/components/ui/`.**

| Componente    | Props principais                                                              |
|---------------|-------------------------------------------------------------------------------|
| `Button`      | `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg/icon). Nunca use `<button>` raw |
| `Input`       | `icon`, `label`, `error`, `helper`                                            |
| `Modal`       | `isOpen`, `onClose`, `title`, `size` (sm/md/lg), focus trap                  |
| `Dropdown`    | `options`, `value`, `onChange`                                                |
| `Tooltip`     | `content`, `side` — Radix Tooltip                                             |
| `Avatar`      | `name`, `src`, `size` (sm/md/lg)                                              |
| `Checkbox`    | `checked`, `onChange`, `disabled`                                             |
| `DatePicker`  | `value`, `onChange`, com `QuickRangeKind` para atalhos                        |
| `DragAndDrop` | Área de upload com drag-and-drop                                              |
| `Toast`       | Gerenciado via `toastSlice` — não renderize diretamente                       |
| `Empty`       | `icon`, `title`, `description`                                                |
| `Spinner`     | `fullPage?`                                                                   |

---

## Parsers de API (`src/api/parsers.ts`)

Substituem o Zod. Funções puras que recebem `unknown` e retornam `T | null`.

| Função                    | Transforma                                      |
|---------------------------|-------------------------------------------------|
| `parseVideo`              | Vídeo único                                     |
| `parseVideoList`          | Envelope paginado `{data, meta}` do Laravel     |
| `parsePlaylist`           | Playlist única                                  |
| `parsePlaylistList`       | Array de playlists                              |
| `parseComment`            | Comentário único                                |
| `parseCommentList`        | Lista paginada de comentários                   |
| `parseCommentReplies`     | Array de respostas                              |
| `parseCommentVersions`    | Array de versões de comentário                  |
| `parseUser`               | Usuário / Canal                                 |
| `parseUserArray`          | Array de usuários                               |
| `parseLoginResponse`      | Resposta de login `{ user }`                    |
| `parseVideoSummary`       | Resumo de vídeo                                 |
| `parseVideoTranscription` | Transcrição de vídeo                            |
| `parseToggleLike`         | Resposta de like em comentário                  |

Todas normalizam `snake_case → camelCase` e aplicam defaults. Importar de `@api/parsers` ou `./parsers`.

---

## Nomenclatura de arquivos

- **camelCase**: `useVideo.ts`, `mockVideos.ts`. Palavra única: tudo minúsculo.
- **Componentes multi-palavra**: `palavra1/palavra2.tsx` → ex: `filter/panel.tsx`, `video/card.tsx`
- **Componentes de palavra única**: `pasta/pasta.tsx` → ex: `header/header.tsx`
- **CSS**: mesmo nome do componente, mesma pasta: `filter/panel.css`
- **Testes**: espelham `src/` em `tests/` → `tests/store/videoSlice.test.ts`

---

## Declaração de funções

```tsx
// Componentes: named function, nunca arrow no export default
export default function VideoCard({ video }: Props) { ... }

// Handlers internos: function declaration no corpo do componente
function handleClick() { ... }

// Arrow functions: apenas callbacks inline
.map(v => <VideoCard key={v.id} video={v} />)
onClick={() => dispatch(videoActions.deleteVideo(id))}
```

---

## Early return

Sempre retorne cedo. Caminho feliz no menor nível de indentação.

```tsx
function handleSubmit() {
    const isTitleEmpty = title.trim() === '';

    if (isTitleEmpty) {
        return;
    }

    saveVideo();
    onClose();
}
```

---

## Condições booleanas nomeadas

Extraia condições em variáveis com prefixos `is`, `has`, `should`, `can`. Nunca expressões brutas no `if`.

```tsx
const isAlreadyFirst = prev[0] === videoId;

if (isAlreadyFirst) {
    return prev;
}
```

---

## CSS — Convenções

- **BEM-like**: `bloco__elemento--modificador` — ex: `app-header__search-input`, `video-page__channel-row--subscribed`
- Design tokens em `src/styles/base.css`:
  - Cores: `--accent`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-2`, `--text-3`
  - Raios: `--radius-sm`, `--radius-md`, `--radius-lg`
  - Espaçamento: `--space-1` … `--space-8`
  - Layout responsivo: `--page-padding-x`, `--page-padding-y` (ajustam em `@media`)
- Tema claro/escuro: `[data-mode='light']` no `:root`
- Cores de acento: `[data-color='violet']`, `[data-color='blue']`, etc.
- Cada componente importa seu próprio `.css`
- CSS dinâmico via `cn()` (`src/utils/cn.ts`) ou array com `.filter(Boolean).join(' ')`

---

## Internacionalização

- **Nunca texto hardcoded** — sempre `t('chave')` via `useTranslation()`
- Adicione chaves em `src/i18n/locales/en.json` **e** `pt.json` sempre que adicionar texto novo
- Fora de componente React: `import { t } from 'i18next'`

---

## Acessibilidade (a11y)

- **Botão com ícone + texto**: label acessível vem do texto visível
- **Botão só com ícone**: obrigatório `aria-label` + `<Tooltip>` do Radix
- **Botão toggle**: `aria-pressed={isActive}`
- **Dropdown trigger**: `aria-expanded={open}` + `aria-haspopup="true"`
- **Abas**: container `role="tablist"`, cada aba `role="tab"` + `aria-selected`
- **NavLink da sidebar**: use `title` + `aria-label` nativo (nunca Radix `<Tooltip>` em NavLink)

---

## ESLint — Regras críticas

Configuração em `eslint.config.js`. Erros bloqueiam CI.

### Formatação
- **4 espaços** de indentação
- **Aspas simples**, ponto-e-vírgula obrigatório
- Trailing comma em multiline
- Limite de linha: **170 chars** (warn)
- Newline no fim do arquivo

### Controle de fluxo — as mais esquecidas

```tsx
// ✅ Correto — curly braces obrigatórias, brace-style 1tbs
if (isEmpty) {
    return null;
}

// ❌ Errado — single-line block viola brace-style 1tbs
if (isEmpty) { return null; }

// ✅ Correto — blank line obrigatória antes de if após outro bloco
const result = compute();

if (!result) {
    return;
}

// ❌ Errado — sem blank line antes do if
const result = compute();
if (!result) {
    return;
}

// ✅ Correto — no-else-return
if (isError) {
    return handleError();
}

return handleSuccess();

// ❌ Errado — else após return
if (isError) {
    return handleError();
} else {
    return handleSuccess();
}
```

### TypeScript
- `no-explicit-any`: error — use `unknown` + type guard
- `no-unused-vars`: error — prefixe com `_` se intencional (`_unused`)
- `consistent-type-imports`: error — `import type { Foo }` para tipos
- `array-type`: `T[]` (não `Array<T>`)

### React Hooks
- `react-hooks/set-state-in-effect`: se precisar chamar `setState` dentro de `useLayoutEffect`, adicione `// eslint-disable-next-line react-hooks/set-state-in-effect` com justificativa
- `react-hooks/exhaustive-deps`: corrija dependências; se necessário, disable-line com comentário explicando por quê

### Pasta `docs/`
TypeDoc gera arquivos em `docs/` — essa pasta está no `globalIgnores` do `eslint.config.js`. Nunca remova esse ignore.

---

## Testes — Convenções (Vitest)

- Framework: **Vitest** + **React Testing Library**
- Arquivos em `tests/` espelhando `src/`
- Todo arquivo novo de produção deve ter teste correspondente

### Ao testar reducers de slice

Passe objetos **completos** com todos os campos obrigatórios. O slice não gera campos automaticamente.

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import videoSlice, { videoActions } from '@store/videoSlice';

// ✅ payload completo — addVideo recebe Video inteiro
const next = reducer(state, videoActions.addVideo(makeVideo({ id: vid('v-new'), title: 'New' })));

// ❌ payload parcial — campos ficam undefined
const next = reducer(state, videoActions.addVideo({ title: 'New', status: 'published' }));
```

---

## Boas práticas de componentes

### Componentes são finos — orquestram hooks e renderizam JSX

```tsx
export default function DefaultVideoPlayer({ ... }) {
    const controls   = usePlayerControls(videoRef);
    const playback   = usePlayerPlayback(videoRef, { ... });
    const { popIcon } = usePopIcon();

    function handleTogglePlayWithFeedback() {
        const wasPaused = videoRef.current?.paused ?? true;
        playback.handleTogglePlay();
        popIcon.show(wasPaused ? 'play' : 'pause');
    }

    return ( /* JSX */ );
}
```

Sinais de que o componente precisa ser dividido:
- Mais de 3 `useEffect` no corpo
- `useRef` para timers manuais inline
- `document.addEventListener` direto no componente
- Mais de 250 linhas

### Padrão de hooks e componentes locais de página

Lógica específica de uma página fica em sub-pastas da própria página (nunca em `src/hooks/`):

```
pages/profile/
  profile.tsx
  hooks/
    useProfileSections.ts   # useMemo pesado → retorna dados para o layout
    useProfileStats.ts      # métricas do próprio perfil
    useSpotlightComments.ts # fetch de comentários para a capa
    useEditVideoModal.ts    # estado do modal de edição
  components/
    ProfileSections.tsx     # seção curada (capa + últimos + top + tópicos)
    ProfileVideoGrid.tsx    # grid principal com skeleton e empty state
    ProfileCoverStory.tsx   # capa em destaque com comentários
    ProfileDiamondTiers.tsx # top vídeos em grade diamante
    ProfileTopicGrid.tsx    # grade de tópicos por tag
```

Nomeação obrigatória:
- Hooks: `use<Página><Funcionalidade>.ts` — ex: `useProfileSections.ts`
- Componentes: `<Página><Funcionalidade>.tsx` — ex: `ProfileSections.tsx`
- Sempre em PascalCase; nomes multi-palavra sem separador

### Extraia um hook quando

- A lógica aparece em 2+ componentes
- É um `useEffect` auto-contido com setup + cleanup
- Gerencia um timer com ref + state + cleanup
- Acopla um event listener ao `document`/`window`

### Padrão cbRef para callbacks estáveis em hooks

```ts
export function useVolumeWheel(containerRef, videoRef, applyVolume, revealControls) {
    const cbRef = useRef({ applyVolume, revealControls });
    cbRef.current = { applyVolume, revealControls };

    useEffect(() => {
        function onWheel(e: WheelEvent) {
            cbRef.current.applyVolume(newVol);
            cbRef.current.revealControls();
        }
        container.addEventListener('wheel', onWheel, { passive: true });
        return () => container.removeEventListener('wheel', onWheel);
    }, [containerRef, videoRef]);
}
```

---

## Gotchas importantes

1. **`docs/` ignorada pelo ESLint** — TypeDoc gera JS em `docs/`. Já está no `globalIgnores`. Nunca delete essa entrada.
2. **Vuid ≠ UUID v4** — `vuid` é `Str::random(11)`. Não valide com regex de UUID.
3. **Watch Later auto-criada** — ao criar um `User`, o backend cria automaticamente uma playlist "Watch Later". Considere isso ao contar playlists em testes.
4. **`useLayoutEffect` + setState** — o lint bloqueia chamadas de `setState` síncronas em `useLayoutEffect`. Use `// eslint-disable-next-line` com comentário explicando por quê.
5. **`@ui` dentro de `ui/`** — use caminho relativo para evitar circular dependency com o barrel.
6. **Status 202 em upload** — `POST /api/videos` retorna 202 (não 201) porque o processamento é assíncrono.
7. **`useBootstrap`** — chamado uma vez no `AppInit`. Não chame novamente em componentes filhos.
8. **`useRealtime`** — também no `AppInit`. `getEcho()` é agora async (carrega Pusher/laravel-echo via dynamic import apenas quando necessário). Conecta após login; desconecta no logout via `destroyEcho()`.
9. **Tus Location rewrite** — o proxy Vite reescreve o header `Location` das respostas tus de `http://backend:8000/...` para `http://localhost:5173/...` via `configure` handler em `vite.config.ts`. Sem isso, o `tus-js-client` tenta PATCH direto no host interno do Docker.
10. **Impressões em batch** — não chame `analytics.impressions()` diretamente. Use `impressionBatcher.ts` que debounce 1s e agrupa até 50 itens por source.
11. **`store/types.ts` isolado** — `RootState` e `AppDispatch` vivem em `types.ts`, não em `index.ts`, para quebrar a dependência circular `index.ts → persistMiddleware → types.ts`.
