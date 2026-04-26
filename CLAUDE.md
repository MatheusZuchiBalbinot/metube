# Vidsum

## Resumo da aplicacao

Plataforma de video com resumos gerados por IA, inspirada no YouTube. O usuario pode assistir videos, organizar em playlists, acompanhar historico, curtir/descurtir, salvar, inscrever-se em canais e visualizar resumos inteligentes (capitulos, transcricao, pontos-chave).

### Funcionalidades principais

- **Player completo**: HLS streaming (hls.js), controles de playback, atalhos de teclado, modo teatro, mini-player flutuante
- **Shorts**: Feed vertical de videos curtos com scroll snap e controle de volume persistente
- **Descoberta**: Carousel de trending, "Continue Watching", recomendacoes, filtros por tag/data/ordenacao, busca global
- **Organizacao**: Playlists com drag-and-drop, historico com filtro por periodo, videos curtidos/salvos/watch later
- **Canais**: Pagina de canal com estatisticas, top tags, video mais visto
- **Perfil**: Bio, heatmap de atividade, abas de conteudo
- **Temas**: Dark/light + 5 cores de acento (violet, blue, pink, orange, green)
- **i18n**: Portugues e ingles (i18next)
- **Acessibilidade**: WCAG 2.2, navegacao por teclado, screen readers, ARIA completo
- **Cross-tab sync**: Estado sincronizado entre abas via `storage` event

---

## Arquitetura

```
                     :80                   :5173
                   ┌───────┐            ┌──────────┐
  browser ──────── │ nginx │ ─── /api → │ backend  │ (FrankenPHP/Octane)
                   └───┬───┘            └────┬─────┘
                       │                     │
                   ┌───┴───┐          ┌──────┴─────┐
                   │ front │          │  postgres   │ :5432
                   │ (Vite)│          │  redis      │ :6379
                   └───────┘          └────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite (porta 5173)
- **Backend**: Laravel 12 + FrankenPHP/Octane (porta 8000 interna)
- **Auth**: Laravel Sanctum stateful (cookie de sessao, nunca JWT)
- **DB**: PostgreSQL 16
- **Cache/Sessions**: Redis 7
- **Proxy**: Nginx Alpine (porta 80)

---

## Scripts

```bash
npm run start     # docker compose up --build (sobe tudo)
npm run stop      # docker compose down
```

---

## Backend

### API Routes

```
POST  /auth/login     (throttle: 5/min)  → AuthController::login
POST  /auth/logout    (auth + session)    → AuthController::logout
GET   /auth/me        (auth + session)    → AuthController::me
```

### Middleware

- `auth:sanctum` — autenticacao via Sanctum
- `session.version` — valida `session_version` do usuario; forca logout se divergente (invalidacao cross-tab)

### Convencoes backend

- Testes com **Pest** (nunca PHPUnit raw), agrupados por `describe()` blocks
- SQLite in-memory para testes, array drivers para session/cache

---

## Frontend

### Stack

- **React 19** com React Compiler (babel-plugin-react-compiler)
- **TypeScript 5.9** estrito
- **Vite 7** como bundler (chunk splitting customizado por vendor)
- **Redux Toolkit** para estado global + persistMiddleware customizado
- **React Router v7** para navegacao
- **Tailwind CSS v4** (utilitarios pontuais) + **CSS puro** com variaveis (estilizacao principal)
- **Radix UI** (tooltip, popover) + **Lucide React** (icones)
- **Framer Motion** para animacoes
- **Axios** com interceptor de sessao expirada

### State Management (Redux)

| Slice | Responsabilidade |
|---|---|
| `videoSlice` | Videos, historico, likes/dislikes/saves, progresso, mini-player, teatro, shorts |
| `authSlice` | Login, sessao, usuario autenticado |
| `themeSlice` | Modo (dark/light) + cor de acento |
| `toastSlice` | Notificacoes (max 3 simultaneas) |
| `playlistSlice` | Playlists com videoIds, drag-and-drop |
| `subscriptionSlice` | Inscricoes em canais |
| `searchSlice` | Buscas recentes (max 5, dedup por lowercase) |

- Persistencia em localStorage via `persistMiddleware`
- Sync cross-tab via `crossTabSync.ts` (escuta `storage` events)
- Hooks tipados: `useAppDispatch()`, `useAppSelector()`

### Aliases de importacao

| Alias | Aponta para |
|---|---|
| `@context/*` | `src/context/*` |
| `@components/*` | `src/components/*` |
| `@ui` / `@ui/*` | `src/components/ui` (barrel) |
| `@pages/*` | `src/pages/*` |
| `@styles/*` | `src/styles/*` |
| `@data/*` | `src/data/*` |
| `@utils/*` | `src/utils/*` |
| `@hooks/*` | `src/hooks/*` |
| `@store` / `@store/*` | `src/store/*` |
| `@models/*` | `src/types/*` (DTOs de dominio) |

**Excecao**: dentro de `src/components/ui/`, use caminho relativo (`../button/button`) para evitar dependencia circular com o barrel `@ui`.

### Hooks principais

| Hook | Uso |
|---|---|
| `useVideo` | CRUD de video, filtros, progresso, mini-player |
| `useAuth` | Autenticacao, usuario logado |
| `useHls` | Setup de HLS streaming com fallback |
| `usePlayerKeyboard` | Atalhos de teclado do player |
| `usePlayerControls` | Visibilidade dos controles do player |
| `usePlayerPlayback` | Estado de play/pause/seek/volume |
| `useVideoProgress` | Tracking de progresso + persist |
| `useFilterState` | Estado do painel de filtros |
| `usePlaylist` | Criacao/edicao de playlists |
| `useSubscription` | Inscricoes em canais |
| `useDebounce` | Debounce de input |
| `useInView` | Intersection Observer para lazy loading |
| `useBurstAnimation` | Animacao de burst em reacoes |

### Rotas

Definidas em `src/utils/routes.ts` como `ROUTES`. Nunca use strings literais.

```
/             → HomePage           /shorts       → ShortsPage
/login        → LoginPage          /channel/:id  → ChannelPage
/history      → HistoryPage        /video/:id    → VideoPage
/playlists    → PlaylistsPage      /search       → SearchPage (?q=)
/watch-later  → WatchLaterPage     /profile      → ProfilePage
/liked        → LikedPage          /user/:id     → ProfilePage (outro)
```

Todas exceto `/login` sao protegidas pelo componente `Guard`.

### Primitivos de UI (`@ui`)

Antes de criar qualquer elemento interativo, verifique se ja existe em `src/components/ui/`.

| Componente | Uso |
|---|---|
| `Button` | Todo `<button>`. Nunca use `<button>` raw. Variants: primary/secondary/ghost/danger. Sizes: sm/md/lg/icon |
| `Input` | Campos de texto. Suporta `icon`, `label`, `error`, `helper` |
| `Modal` | Dialogs. Suporta `isOpen`, `onClose`, `title`, `size` (sm/md/lg), focus trap |
| `Dropdown` | Selects customizados. Recebe `options`, `value`, `onChange` |
| `Tooltip` | Tooltip acessivel via Radix. Recebe `content`, `side` |
| `Avatar` | Avatar com iniciais ou imagem. Sizes: sm/md/lg |
| `Badge` | Labels de status/categoria |
| `Card` | Container com borda e sombra |
| `Spinner` | Indicador de carregamento |
| `Skeleton` | Placeholder de loading |
| `DatePicker` | Seletor de data com popover |
| `DragAndDrop` | Area de upload com drag-and-drop |
| `Toast` | Notificacoes temporarias (gerenciado via toastSlice) |

---

## Convencoes de codigo (Frontend)

### Nomenclatura de arquivos

- **camelCase**: `useVideo.ts`, `mockVideos.ts`. Palavra unica: tudo minusculo.
- **Componentes multi-palavra**: `palavra1/palavra2.tsx` (ex: `filter/panel.tsx`, `video/card.tsx`)
- **Componentes de palavra unica**: `pasta/pasta.tsx` (ex: `header/header.tsx`)
- **CSS**: mesmo nome do componente, na mesma pasta: `filter/panel.css`

### Declaracao de funcoes

- Componentes: `export default function NomeDoComponente()` — nunca arrow function no export
- Handlers internos: `function handleClick()` dentro do corpo do componente
- Arrow functions: apenas em callbacks inline (`.map()`, `onClick={() => ...}`)

### Early return

Sempre retorne cedo. Caminho feliz no menor nivel de indentacao.

```tsx
function handleSubmit() {
    const isTitleEmpty = title.trim() === '';
    if (isTitleEmpty) { return; }
    saveVideo();
    onClose();
}
```

### Condicoes booleanas nomeadas

Extraia condicoes em variaveis com prefixos: `is`, `has`, `should`, `can`. Nunca expressoes brutas no `if`.

```tsx
const isAlreadyFirst = prev[0] === videoId;
if (isAlreadyFirst) { return prev; }
```

### CSS classes dinamicas

```tsx
const classes = ['btn', `btn--${variant}`, isActive ? 'btn--active' : '', className]
    .filter(Boolean)
    .join(' ');
```

### Constantes

- Modulo: `const NOME_SCREAMING_SNAKE = ...` com `as const`
- Enums: objeto `as const` com tipo derivado:

```tsx
export const SortBy = { RECENT: 'recent', VIEWS: 'views', AZ: 'az' } as const;
export type SortBy = typeof SortBy[keyof typeof SortBy];
```

### Internacionalizacao

- Nunca texto hardcoded — sempre `t('chave')` via `useTranslation()`
- Traducoes em `src/i18n/locales/en.json` e `pt.json` — adicione em ambos
- Fora de componente: `import { t } from 'i18next'`

---

## Acessibilidade (a11y)

- **Botao com icone + texto**: label acessivel vem do texto
- **Botao so com icone**: obrigatorio `aria-label` + `<Tooltip>` do Radix
- **Botao toggle**: `aria-pressed={isActive}`
- **Dropdown trigger**: `aria-expanded={open}` + `aria-haspopup="true"`
- **Abas**: container `role="tablist"`, cada aba `role="tab"` + `aria-selected`
- **NavLink da sidebar**: use `title` + `aria-label` nativo (nunca Radix `<Tooltip>` em NavLink)

---

## ESLint

Configuracao em `frontend/eslint.config.js`. Regras principais:

### Formatacao
- 4 espacos de indentacao
- Aspas simples, ponto-e-virgula obrigatorio
- Trailing comma em multiline
- Limite de linha: **170 chars** (warn)
- Newline no fim do arquivo

### Qualidade
- `no-var`, `prefer-const`, `eqeqeq`, `prefer-template`
- `no-nested-ternary`, `no-unneeded-ternary`
- `no-console` (warn)

### Controle de fluxo
- **Curly braces obrigatorias** (mesmo em if de uma linha)
- **Brace style**: 1tbs, sem single-line
- **Blank line obrigatoria** antes de `if` quando precedido de block
- **no-else-return**: else apos return proibido
- **max-depth**: 3 (warn), **max-nested-callbacks**: 3 (warn)
- **complexity**: 8 (warn)

### TypeScript
- `no-explicit-any`: error
- `no-unused-vars`: error (exceto `_prefixed`)
- `consistent-type-imports`: error (`import type`)
- `array-type`: `T[]` (array syntax)

### React
- React Hooks rules enforced
- `react-refresh/only-export-components`: warn

---

## CSS

- **BEM-like**: `bloco__elemento--modificador` (ex: `app-header__search-input`, `profile-page__tab--active`)
- Variaveis globais em `src/styles/base.css`: `--accent`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-2`, `--radius-sm`, `--radius-md`
- Tema claro/escuro: `[data-mode='light']` no `:root`
- Cores de acento: `[data-color='violet']`, `[data-color='blue']`, etc.
- Cada componente importa seu proprio `.css`

---

## Estrutura de arquivos (Frontend)

```
src/
  App.tsx                          # Roteamento, providers
  main.tsx                         # Entry point

  components/
    filter/panel.tsx               # Barra de filtros horizontal
    guard/guard.tsx                # Protege rotas autenticadas
    header/header.tsx              # AppHeader (logo, busca, avatar)
    layout/layout.tsx              # Shell: header + sidebar + <Outlet>
    layout/pageSkeleton.tsx        # Skeleton por rota
    mini/player.tsx                # Mini-player flutuante
    player/player.tsx              # VideoPlayer principal
    player/playerSeekBar.tsx       # Seek bar com preview
    player/playerSettings.tsx      # Painel de velocidade
    player/playerOverlays.tsx      # Overlays (buffering, skip, pop)
    sidebar/sidebar.tsx            # Navegacao lateral
    tag/input.tsx + badge.tsx      # TagInput e TagBadge
    upload/modal.tsx               # UploadModal
    video/card.tsx + row.tsx       # VideoCard e VideoRow
    video/shortPlayer.tsx          # Player vertical para Shorts
    video/reactionBtn.tsx          # Botao de like/dislike/save
    ui/                            # Primitivos (barrel @ui)

  hooks/                           # Custom hooks (ver tabela acima)
  store/                           # Redux slices + persist + crossTabSync
  pages/                           # Paginas (1 pasta por rota)
  context/                         # React contexts + hooks
  data/                            # Mock data (videos, summaries, playlists)
  types/                           # DTOs de dominio (@models)
  utils/                           # Utilitarios puros
  styles/                          # CSS global (base, animations, tailwind)
  i18n/                            # Configuracao + locales (en.json, pt.json)
```

---

## CI/CD

### GitHub Actions (`frontend.yml`)

- **Trigger**: push/PR em `main` com mudancas em `frontend/`
- **Node 22** com cache de npm
- **Steps**: `npm ci` → `tsc --noEmit` → `npm run lint` → `npm test` → `npm audit --audit-level=high`

### Docker Compose

| Servico | Imagem | Porta |
|---|---|---|
| postgres | postgres:16 | 5432 |
| redis | redis:7-alpine | 6379 |
| backend | FrankenPHP | 8000 (interna) |
| frontend | Node/Vite | 5173 |
| nginx | nginx:alpine | 80 |
