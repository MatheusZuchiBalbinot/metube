# Frontend — Guia Completo

Stack: **React 19 + TypeScript 5.9 + Vite 7 + Redux Toolkit + React Router v7**

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
  App.tsx                     # Roteamento, providers
  main.tsx                    # Entry point

  api/                        # Clientes HTTP por domínio
    client.ts                 # ApiClient base (axios)
    auth.ts                   # AuthApi
    channels.ts               # ChannelApi
    history.ts                # HistoryApi
    interactions.ts           # InteractionsApi
    playlists.ts              # PlaylistApi
    videos.ts                 # VideoApi
    index.ts                  # barrel: re-exporta instâncias tipadas

  components/
    error/boundary.tsx        # ErrorBoundary
    filter/panel.tsx          # FilterPanel (barra horizontal de filtros)
    guard/guard.tsx           # Guard (protege rotas autenticadas)
    header/header.tsx         # AppHeader
    layout/layout.tsx         # Shell: header + sidebar + <Outlet>
    layout/pageSkeleton.tsx   # Skeleton por rota
    mini/player.tsx           # Mini-player flutuante
    player/player.tsx         # VideoPlayer principal
    player/playerSeekBar.tsx  # Seek bar com preview
    player/playerSettings.tsx # Painel de velocidade
    player/playerOverlays.tsx # Overlays (buffering, skip, pop)
    playlist/card.tsx         # PlaylistCard
    preferences/preferences.tsx
    shortcuts/shortcuts.tsx   # Painel de atalhos de teclado
    sidebar/sidebar.tsx       # Navegação lateral
    tag/input.tsx             # TagInput
    tag/badge.tsx             # TagBadge
    upload/modal.tsx          # UploadModal
    video/actionCard.tsx      # VideoActionCard
    video/card.tsx            # VideoCard
    video/cardSkeleton.tsx    # VideoCardSkeleton
    video/hero.tsx            # VideoHero (banner de destaque)
    video/reactionBtn.tsx     # ReactionButton (like/dislike/save)
    video/readingMode.tsx     # ReadingMode (transcrição)
    video/row.tsx             # VideoRow
    video/rowSkeleton.tsx     # VideoRowSkeleton
    video/savePopover.tsx     # SavePopover (adicionar a playlist)
    video/statusBadges.tsx    # VideoStatusBadges
    ui/                       # Primitivos (barrel @ui)

  hooks/                      # Custom hooks
  store/                      # Redux slices + middleware
  pages/                      # Páginas (1 pasta por rota)
  context/                    # React contexts
  types/                      # DTOs de domínio (@models)
  utils/                      # Utilitários puros
  styles/                     # CSS global
  i18n/                       # Config + locales (en.json, pt.json)
  validation/                 # Schemas Zod

tests/                        # Vitest — espelha src/
  components/
  store/
  utils/
```

---

## Aliases de importação

| Alias           | Aponta para                  |
|-----------------|------------------------------|
| `@context/*`    | `src/context/*`              |
| `@components/*` | `src/components/*`           |
| `@ui`           | `src/components/ui` (barrel) |
| `@ui/*`         | `src/components/ui/*`        |
| `@pages/*`      | `src/pages/*`                |
| `@styles/*`     | `src/styles/*`               |
| `@data/*`       | `src/data/*`                 |
| `@utils/*`      | `src/utils/*`                |
| `@hooks/*`      | `src/hooks/*`                |
| `@store`        | `src/store` (barrel)         |
| `@store/*`      | `src/store/*`                |
| `@models/*`     | `src/types/*`                |

**Exceção crítica**: dentro de `src/components/ui/`, use caminho relativo (`../button/button`). Usar `@ui` dentro de `ui/` cria dependência circular com o barrel.

---

## Rotas

Definidas em `src/utils/routes.ts` como `ROUTES`. **Nunca use strings literais de rota.**

```
/              → HomePage         /shorts        → ShortsPage
/login         → LoginPage        /channel/:id   → ChannelPage
/history       → HistoryPage      /video/:id     → VideoPage
/playlists     → PlaylistsPage    /search        → SearchPage (?q=)
/watch-later   → WatchLaterPage   /profile       → ProfilePage
/liked         → LikedPage        /user/:id      → ProfilePage (outro usuário)
```

Todas exceto `/login` são protegidas pelo componente `Guard`.

---

## API Client

Cada domínio tem uma classe com `baseUrl` privado. **Nunca use axios ou fetch diretamente nos componentes/hooks** — use as classes em `src/api/`.

```ts
import { video, auth, playlist, channel, history, interactions } from '@api';

await video.list({ page: 1, tags: ['react'] });
await video.get(vuid);
await video.toggleLike(vuid);
await auth.login({ email, password });
await playlist.list();
await playlist.addVideo(puid, vuid);
await channel.toggleSubscription(uuid);
await interactions.liked();
```

Respostas validadas com Zod antes de chegar ao store.

---

## Redux Slices

| Slice               | Responsabilidade                                                      |
|---------------------|-----------------------------------------------------------------------|
| `videoSlice`        | videos, watchHistory, likes/dislikes/saves, progresso, mini-player, teatro, shorts |
| `authSlice`         | login, sessão, usuário autenticado                                    |
| `themeSlice`        | modo (dark/light) + cor de acento                                    |
| `toastSlice`        | notificações (max 3 simultâneas)                                     |
| `playlistSlice`     | playlists com videoIds, drag-and-drop                                |
| `subscriptionSlice` | inscrições em canais                                                 |
| `searchSlice`       | buscas recentes (max 5, dedup por lowercase)                         |

- Persistência em localStorage via `persistMiddleware`
- Sync cross-tab via `crossTabSync.ts` (escuta `storage` events)
- Hooks tipados: `useAppDispatch()`, `useAppSelector()`

---

## Hooks principais

| Hook                     | Uso                                                    |
|--------------------------|--------------------------------------------------------|
| `useVideo`               | CRUD de vídeo, filtros, progresso, mini-player         |
| `useAuth`                | autenticação, usuário logado                           |
| `useBootstrap`           | popula Redux do backend após login                     |
| `usePlaylist`            | CRUD de playlists (sincroniza com API)                 |
| `useSubscription`        | toggle de inscrição em canal                           |
| `useHls`                 | setup de HLS streaming com fallback                    |
| `usePlayerKeyboard`      | atalhos de teclado do player                           |
| `usePlayerControls`      | visibilidade dos controles do player                   |
| `usePlayerPlayback`      | estado de play/pause/seek/volume                       |
| `useVideoProgress`       | tracking de progresso + persist                        |
| `useVideoProcessingPoll` | polling de vídeos com status=processing                |
| `useFilterState`         | estado do painel de filtros                            |
| `useUpload`              | upload de arquivo com progresso                        |
| `useAutoplay`            | lógica de autoplay                                     |
| `useDebounce`            | debounce de input                                      |
| `useInView`              | Intersection Observer para lazy loading                |
| `useMediaQuery`          | detecta breakpoints (ex: isMobile)                    |
| `useBurstAnimation`      | animação de burst em reações                           |

---

## Primitivos de UI (`@ui`)

**Antes de criar qualquer elemento interativo, verifique se já existe em `src/components/ui/`.**

| Componente    | Uso                                                                          |
|---------------|------------------------------------------------------------------------------|
| `Button`      | Todo `<button>`. Nunca use `<button>` raw. Variants: primary/secondary/ghost/danger. Sizes: sm/md/lg/icon |
| `Input`       | Campos de texto. Suporta `icon`, `label`, `error`, `helper`                  |
| `Modal`       | Dialogs. Suporta `isOpen`, `onClose`, `title`, `size` (sm/md/lg), focus trap |
| `Dropdown`    | Selects customizados. Recebe `options`, `value`, `onChange`                  |
| `Tooltip`     | Tooltip acessível via Radix. Recebe `content`, `side`                        |
| `Avatar`      | Avatar com iniciais ou imagem. Sizes: sm/md/lg                               |
| `Badge`       | Labels de status/categoria                                                   |
| `Card`        | Container com borda e sombra                                                 |
| `Spinner`     | Indicador de carregamento                                                    |
| `Skeleton`    | Placeholder de loading                                                       |
| `DatePicker`  | Seletor de data com popover                                                  |
| `DragAndDrop` | Área de upload com drag-and-drop                                             |
| `Toast`       | Notificações temporárias (gerenciado via toastSlice)                         |
| `Empty`       | Estado vazio com ícone e mensagem                                            |
| `PageLoader`  | Loading de página inteira                                                    |
| `CarouselNav` | Navegação de carousel                                                        |
| `NavProgress` | Barra de progresso de navegação                                              |

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

## CSS classes dinâmicas

```tsx
const classes = ['btn', `btn--${variant}`, isActive ? 'btn--active' : '', className]
    .filter(Boolean)
    .join(' ');
```

---

## Constantes e enums

```tsx
// Módulo: SCREAMING_SNAKE com as const
const MAX_SEARCH_HISTORY = 5 as const;

// Enums: objeto as const com tipo derivado
export const SortBy = { RECENT: 'recent', VIEWS: 'views', AZ: 'az' } as const;
export type SortBy = typeof SortBy[keyof typeof SortBy];
```

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
- `react-hooks/exhaustive-deps`: corrija dependências; se necessário, adicione disable-line com comentário explicando o porquê

### Ponto de atenção: pasta `docs/`
TypeDoc gera arquivos em `docs/` — essa pasta está no `globalIgnores` do `eslint.config.js`. Nunca remova esse ignore.

---

## CSS — Convenções

- **BEM-like**: `bloco__elemento--modificador` — ex: `app-header__search-input`, `video-page__channel-row--subscribed`
- Variáveis globais em `src/styles/base.css`:
  - Cores: `--accent`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-2`, `--text-3`
  - Raios: `--radius-sm`, `--radius-md`, `--radius-lg`
  - Espaçamento: `--space-1` … `--space-8`
  - Layout responsivo: `--page-padding-x`, `--page-padding-y` (ajustam em `@media`)
- Tema claro/escuro: `[data-mode='light']` no `:root`
- Cores de acento: `[data-color='violet']`, `[data-color='blue']`, etc.
- Cada componente importa seu próprio `.css`

---

## Identificadores tipados

```ts
type VideoId   = string & { readonly _brand: 'VideoId' }   // id local Redux
type Vuid      = string & { readonly _brand: 'Vuid' }       // id da API
type ChannelId = string & { readonly _brand: 'ChannelId' }
type Puid      = string & { readonly _brand: 'Puid' }       // id de playlist
type Uuid      = string & { readonly _brand: 'Uuid' }       // id de usuário
```

Use type casts explícitos ao construir mocks: `'v-test' as unknown as VideoId`.

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

// ❌ payload parcial — id fica undefined
const next = reducer(state, videoActions.addVideo({ title: 'New', status: 'published' }));
```

---

## Validação (Zod)

Schemas em `src/validation/schemas/`. Todo dado da API é validado antes de chegar ao Redux.

- `VideoApiSchema` → transforma snake_case da API em camelCase
- `PlaylistApiSchema` → mesma coisa para playlists
- `VideoListApiSchema` — envelope `{data, meta}` do paginator Laravel, transforma `current_page`/`per_page` → `page`/`perPage`

---

## Gotchas importantes

1. **`docs/` ignorada pelo ESLint** — TypeDoc gera JS em `docs/`. Já está no `globalIgnores`. Nunca delete essa entrada.
2. **Vuid ≠ UUID v4** — `vuid` é `Str::random(11)`. Não valide com regex de UUID.
3. **Watch Later auto-criada** — ao criar um `User`, o backend cria automaticamente uma playlist "Watch Later". Considere isso ao contar playlists em testes.
4. **`useLayoutEffect` + setState** — o lint bloqueia chamadas de `setState` síncronas em `useLayoutEffect`. Use `// eslint-disable-next-line` quando necessário, com comentário explicando por quê.
5. **`@ui` dentro de `ui/`** — use caminho relativo para evitar circular dependency com o barrel.
6. **Status 202 em upload** — `POST /api/videos` retorna 202 (não 201) porque o processamento é assíncrono.
7. **`useBootstrap`** — deve ser chamado uma vez após login para popular Redux do backend. Já está no fluxo de auth — não chame novamente em componentes filhos.

---

## Boas práticas de componentes

### Componentes são finos — orquestram hooks e renderizam JSX

```tsx
// ✅ Bom: cada responsabilidade em seu hook
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
