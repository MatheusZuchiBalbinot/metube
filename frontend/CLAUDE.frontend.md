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
    auth/ comment/ error/ filter/ guard/ header/ layout/ mini/
    notifications/ player/ playlist/ preferences/ shortcuts/
    sidebar/ tag/ upload/ video/
    ui/   # Primitivos reutilizáveis — Button, Input, Modal, Dropdown, Tooltip, Avatar,
          # Checkbox, DatePicker, DragAndDrop, Toast, Empty, Spinner, Skeleton, Badge, Card
          # Verifique aqui antes de criar qualquer elemento interativo
          # Importe como `import { Button, Modal } from '@ui'`

  context/
    searchContext.tsx         # SearchProvider — estado de busca com debounce
    search.ts                 # Tipo SearchState
    useSearch.ts              # Hook para consumir SearchContext
    index.ts                  # barrel

  data/
    themeConfig.ts            # Configurações de tema (cores, modos disponíveis)

  enums/                      # Enums TypeScript — importe como `import { ReactionType } from '@enums/reactionType'`

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

Cada domínio tem uma classe com `baseUrl` privado em `src/api/`. **Nunca use axios ou fetch diretamente** — importe as instâncias de `@api`.

Todos os métodos retornam `ApiResult<T>`:

```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
```

**Padrão de consumo em hooks:**

```ts
const result = await video.list({ page: 1 });

if (!result.ok) {
    dispatch(toastActions.show({ message: result.error, type: ToastType.ERROR }));
    return;
}

dispatch(videoActions.setVideos(result.data));
```

**Não** propague erros como `throw` — use o campo `error` do resultado e mostre um toast. Respostas são parseadas por `src/api/parsers.ts` (snake_case → camelCase). Para ver os métodos disponíveis de cada domínio, leia o arquivo de API correspondente.

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
- `react-hooks/set-state-in-effect`: chamar `setState` dentro de `useLayoutEffect` precisa de disable-line com justificativa
- `react-hooks/exhaustive-deps`: corrija dependências; disable-line com comentário explicando por quê se necessário
- `react-hooks/refs`: **não escreva `ref.current = value` no corpo do componente/hook** (durante render). Use `useLayoutEffect` para sincronizar refs com props:
  ```ts
  const cbRef = useRef(callback);
  useLayoutEffect(() => { cbRef.current = callback; });
  ```

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

### Ao testar componentes com React Testing Library

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestStore } from '../helpers/store';  // wrapper que cria store com estado inicial

it('shows error toast on failed submit', async () => {
    render(<MyComponent />, { wrapper: createWrapper(createTestStore()) });
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText(/error/i)).toBeInTheDocument();
});
```

- Use `screen.getByRole` em vez de `getByTestId` — testa comportamento, não implementação
- Não mock módulos inteiros — mock apenas chamadas de API com `vi.spyOn`
- Para testar hooks isolados: `renderHook` do RTL + `act` para disparar efeitos

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

Quando um `useEffect` precisa chamar um callback que muda a cada render (ex: `onX` prop de um hook), use `cbRef` para que o effect não precise do callback como dependência e não seja re-registrado a cada render.

```ts
export function useVolumeWheel(containerRef, videoRef, applyVolume, revealControls) {
    const cbRef = useRef({ applyVolume, revealControls });
    // useLayoutEffect — nunca atribuir diretamente (viola react-hooks/refs)
    useLayoutEffect(() => { cbRef.current = { applyVolume, revealControls }; });

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

## Redux vs estado local

Use **estado local** (`useState`) quando:
- O estado é UI pura que não precisa sobreviver à navegação (modal aberto, aba ativa, loading de botão)
- Só um componente e seus filhos diretos consomem o estado
- O estado não precisa ser sincronizado entre abas

Use **Redux** quando:
- O dado vem da API e precisa ser cacheado globalmente (vídeos, playlists, user)
- Múltiplas páginas ou hooks distantes precisam ler o mesmo dado
- O estado precisa sobreviver à navegação (ex: historico, likes, saves)
- É necessária sincronização entre abas (`crossTabSync`)

Regra prática: se você está passando o mesmo `useState` como prop para mais de 2 níveis de componente, mova para Redux.

---

## Toast

Despache toasts via `toastActions.show` — nunca exiba alertas, `console.error` ou modais para erros de API:

```ts
import { toastActions, ToastType } from '@store/toastSlice';

// Erro de API (padrão ApiResult)
if (!result.ok) {
    dispatch(toastActions.show({ message: result.error, type: ToastType.ERROR }));
    return;
}

// Sucesso
dispatch(toastActions.show({ message: t('video.saved'), type: ToastType.SUCCESS }));
```

Tipos disponíveis: `ToastType.SUCCESS`, `ToastType.ERROR`, `ToastType.INFO`.  
O slice limita 3 toasts simultâneos; toasts mais antigos são descartados automaticamente.

---

## Formulários e validação

Sem biblioteca de forms. Validação via `src/utils/validate.ts`:

```ts
import { validate } from '@utils';

// validate.required(value) → string | null  (null = válido)
// validate.email(value)    → string | null
// validate.minLength(value, n) → string | null

function handleSubmit() {
    const titleError = validate.required(title);

    if (titleError) {
        setError(titleError);
        return;
    }

    submitForm();
}
```

Estado de erro: `const [error, setError] = useState<string | null>(null)`.  
Limpe o erro no `onChange` do campo. Exiba abaixo do input com classe `__error`.

---

## memo e useCallback

`React.memo` só evita re-render se **todas** as props forem referência estável. Um callback inline destrói o benefício:

```tsx
// ❌ onSelect é recriado em cada render — memo do filho não adianta
<VideoCard video={v} onSelect={() => dispatch(selectVideo(v.id))} />

// ✅ useCallback garante referência estável
const handleSelect = useCallback((id: VideoId) => {
    dispatch(selectVideo(id));
}, [dispatch]);

<VideoCard video={v} onSelect={handleSelect} />
```

Não envolva tudo em `useCallback` por padrão — só quando o componente filho é `memo`izado **e** o re-render tem custo real mensurável.

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
