# Frontend — Guia de Desenvolvimento

## Stack

- **React 19** com TypeScript estrito
- **Vite** como bundler (com React Compiler via babel-plugin-react-compiler)
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — usado apenas para utilitários pontuais; estilização principal é CSS puro com variáveis CSS customizadas
- **React Router v6** para navegação
- **i18next / react-i18next** para internacionalização (PT e EN)
- **Radix UI** (`@radix-ui/react-tooltip`, `@radix-ui/react-popover`) para primitivos acessíveis
- **Lucide React** para ícones

---

## Convenções de nomenclatura

### Arquivos e pastas

- Nomes de arquivo: **camelCase** — primeira palavra em minúsculo, subsequentes capitalizadas (ex: `useVideo.ts`, `mockVideos.ts`). Palavras únicas ficam totalmente em minúsculo.
- **Componentes multi-palavra**: divididos em `palavra1/palavra2.tsx` — primeira palavra vira a pasta, segunda vira o arquivo (ex: `filter/panel.tsx`, `video/card.tsx`, `tag/input.tsx`).
- **Componentes de palavra única**: `pasta/pasta.tsx` (ex: `header/header.tsx`, `guard/guard.tsx`).
- CSS acompanha o arquivo principal com o mesmo nome: `header/header.css`, `filter/panel.css`.

### Componentes

- Componentes exportam uma **função nomeada** como `export default function NomeDoPagina()` — nunca arrow function no export default.
- Interfaces de props ficam no mesmo arquivo, acima do componente.

---

## Aliases de importação

Sempre use aliases — nunca caminhos relativos longos como `../../components/...`.

| Alias | Aponta para |
|---|---|
| `@context/*` | `src/context/*` |
| `@components/*` | `src/components/*` |
| `@ui` | `src/components/ui` (barrel export) |
| `@ui/*` | `src/components/ui/*` |
| `@pages/*` | `src/pages/*` |
| `@styles/*` | `src/styles/*` |
| `@data/*` | `src/data/*` |
| `@utils/*` | `src/utils/*` |
| `@lib/*` | `src/lib/*` |
| `@models/*` | `src/types/*` (domain DTOs: Video, Channel, Tag, User, Playlist, etc.) |

**Excecao importante — componentes dentro de `src/components/ui/`:** como eles proprios sao exportados pelo barrel `@ui`, importar de `@ui` dentro deles criaria dependencia circular. Nesses arquivos, use caminho relativo direto: `import Button from '../button/button'`.

---

## Primitivos de UI — sempre verifique antes de criar

Antes de criar qualquer elemento interativo ou visual, verifique se ja existe um primitivo em `src/components/ui/`. Se existir, **use-o**. Se nao existir e for algo reutilizavel, crie um novo primitivo la.

### Primitivos disponíveis (exportados via `@ui`)

| Componente | Uso |
|---|---|
| `Button` | Todo elemento `<button>`. Nunca use `<button>` HTML bruto. |
| `Input` | Campos de texto. Suporta `icon`, `label`, `error`. |
| `Modal` | Dialogs/overlays. Suporta `isOpen`, `onClose`, `title`, `size`. |
| `Dropdown` | Selects customizados. Recebe `options`, `value`, `onChange`. |
| `Tooltip` | Tooltip acessível via Radix. Recebe `content`, `side`. |
| `DatePicker` | Seletor de data com popover e calendário integrado. |
| `Avatar` | Avatar com iniciais ou imagem. Suporta `size` (sm/md/lg). |
| `Badge` | Labels de status/categoria. |
| `Card` | Container com borda e sombra padrão. |
| `Spinner` | Indicador de carregamento. |
| `DragAndDrop` | Área de upload com drag-and-drop. |

### Button — como usar

```tsx
// Variantes: 'primary' | 'secondary' | 'ghost' | 'danger'
// Tamanhos:  'sm' | 'md' | 'lg' | 'icon'

// Botao comum
<Button variant="ghost" onClick={handleClick}>Salvar</Button>

// Botao so com icone — obrigatorio: size="icon" + aria-label + Tooltip
<Tooltip content="Fechar" side="bottom">
    <Button size="icon" variant="ghost" aria-label="Fechar" onClick={onClose}>
        <X size={14} />
    </Button>
</Tooltip>

// Botao com icone a esquerda
<Button variant="primary" leftIcon={<Plus size={14} />}>Criar</Button>

// Botao de loading
<Button loading={isSubmitting}>Enviar</Button>

// Botao full width
<Button fullWidth>Entrar</Button>
```

**Importante:** ao usar `Button` com estilizacao customizada via `className`, prefira `variant="ghost"` para evitar conflito visual com o CSS proprio da classe. O ghost nao tem cor de fundo propria, entao o CSS externo assume o controle.

---

## Acessibilidade — regras obrigatorias

O projeto tem foco forte em acessibilidade. Toda interface deve ser operavel por teclado e compativel com screen readers.

### Botoes

- **Botao com icone + texto**: sem obrigacao de `aria-label` extra (o texto ja e o label acessivel).
- **Botao so com icone**: obrigatorio `aria-label` descritivo E `<Tooltip>` do Radix wrappando o botao.
- **Botao toggle** (theme, idioma, cor): adicionar `aria-pressed={isActive}`.
- **Botao de dropdown trigger**: adicionar `aria-expanded={open}` e `aria-haspopup="true"`.
- **Abas (tabs)**: container com `role="tablist"`, cada aba com `role="tab"` e `aria-selected={isActive}`.
- **Opcoes de listbox**: container com `role="listbox"`, cada opcao com `role="option"` e `aria-selected`.

### NavLink da sidebar

**Nao envolva `NavLink` com `<Tooltip>` do Radix.** O `NavLink` usa `className` como funcao `({ isActive }) => string`, e o Radix `Slot` (usado internamente pelo `Tooltip`) nao consegue fazer merge correto com funcoes — isso quebra o layout. Use o atributo nativo `title` para tooltip de hover e `aria-label` para screen readers:

```tsx
<NavLink
    to={item.to}
    aria-label={t(item.labelKey)}
    title={t(item.labelKey)}
    className={({ isActive }) => [...].join(' ')}
>
```

### Avatar

O componente `Avatar` renderiza como `<div role="img" aria-label={name}>`. Nao adicione `aria-label` duplicado no elemento externo que o envolve — o Tooltip ja cuida disso.

---

## Codigo — estilo e padrões

### Early return

Sempre retorne/lance cedo. O caminho feliz fica no menor nivel de indentacao.

```tsx
// ERRADO
function handleSubmit() {
    if (title.trim() !== '') {
        saveVideo();
        onClose();
    }
}

// CERTO
function handleSubmit() {
    const hasTitleEmpty = title.trim() === '';
    if (hasTitleEmpty) { return; }
    saveVideo();
    onClose();
}
```

### Condicoes booleanas nomeadas

Extraia condicoes de `if` em variaveis com prefixos semanticos: `is`, `has`, `should`, `can`. Nunca use expressoes brutas dentro do `if`.

```tsx
// ERRADO
if (prev[0] === videoId) { return prev; }
if (video.status === VideoStatus.PUBLISHED || ...) { ... }

// CERTO
const isAlreadyFirst = prev[0] === videoId;
if (isAlreadyFirst) { return prev; }

const isPublished = video.status === VideoStatus.PUBLISHED;
const isScheduledAndPast = video.status === VideoStatus.SCHEDULED && ...;
if (isPublished || isScheduledAndPast) { ... }
```

### Declaracao de funcoes

- **Funcoes de componente e helpers de modulo**: `function nome()` — declaracao classica, nunca `const nome = () =>`.
- **Funcoes internas de componente** (handlers, etc.): `function handleClick()` dentro do corpo do componente.
- **Funcoes de utilidade pura em linha** (ex: `scoreVideo` dentro de outra funcao): podem ser `function` local.
- **Arrow functions**: apenas em callbacks inline (`onClick={() => setOpen(false)}`), `.map()`, `.filter()`, `.sort()`.

### Constantes

- Constantes de configuracao em modulo: `const NOME_EM_SCREAMING_SNAKE = ...` com `as const`.
- Enums/uniao de valores: use objeto `as const` com tipo derivado via `typeof`:

```tsx
export const SortBy = {
    RECENT: 'recent',
    VIEWS:  'views',
    AZ:     'az',
} as const;
export type SortBy = typeof SortBy[keyof typeof SortBy];
```

### CSS classes dinamicas

Use arrays + `.filter(Boolean).join(' ')` para construir classes condicionais — nunca template literals complexos ou libs externas para isso:

```tsx
const classes = ['btn', `btn--${variant}`, isActive ? 'btn--active' : '', className]
    .filter(Boolean)
    .join(' ');
```

---

## Internacionalizacao (i18n)

- **Nunca escreva texto em hardcode** em componentes — use sempre `t('chave')` via `useTranslation()`.
- Os arquivos de traducao ficam em `src/i18n/locales/en.json` e `src/i18n/locales/pt.json`.
- Ao adicionar um novo texto, adicione em **ambos** os arquivos simultaneamente.
- Para traducoes em contexto de modulo (fora de componente React), use `import { t } from 'i18next'` diretamente.

---

## Sistema de contextos

Tres contextos principais, cada um com seu proprio hook de acesso:

| Contexto | Arquivo | Hook |
|---|---|---|
| Autenticacao | `context/authContext.tsx` | `useAuth()` de `@context/useAuth` |
| Tema | `context/themeContext.tsx` | `useTheme()` de `@context/useTheme` |
| Videos | `context/videoContext.tsx` | `useVideo()` de `@context/useVideo` |

- Os contextos sao providos em `App.tsx` na ordem: `ThemeProvider > AuthProvider > VideoProvider > TooltipProvider`.
- `TooltipProvider` do Radix **deve** envolver toda a arvore para que os `Tooltip` funcionem — ele ja esta configurado em `App.tsx`.

### VideoContext — acoes disponiveis

```tsx
const {
    videos,           // todos os videos
    watchHistory,     // ids assistidos (ordem cronologica inversa)
    likedVideos,      // Set<string> de ids curtidos
    uploadModalOpen,
    activeTagView,    // { tag, fromVideoId } | null

    addVideo, editVideo, deleteVideo,
    likeVideo, watchVideo,
    openUploadModal, closeUploadModal,
    openTagView, closeTagView,
    getRecommendations, getPublishedVideos,
} = useVideo();
```

---

## Estrutura de arquivos

```
src/
  App.tsx                          # Roteamento, providers, TooltipProvider
  main.tsx                         # Entrada da aplicacao

  components/
    filter/panel.tsx + panel.css   # Barra de filtros horizontal acima do grid
    guard/guard.tsx                # Protege rotas autenticadas
    header/header.tsx + header.css # AppHeader (logo, busca, avatar, prefs)
    layout/layout.tsx + layout.css # Shell: header + sidebar + <Outlet>
    preferences/preferences.tsx    # Painel de preferencias (tema, cor, idioma)
    sidebar/sidebar.tsx + *.css    # AppSidebar com nav links
    tag/
      input.tsx + input.css        # TagInput — chips editaveis
      view.tsx + view.css          # TagView — lista de videos por tag
    upload/modal.tsx + modal.css   # UploadModal — formulario de novo video
    video/
      card.tsx + card.css          # VideoCard — card de grid
      row.tsx + row.css            # VideoRow — linha compacta (tag view)
    ui/                            # Primitivos — exportados via barrel @ui
      avatar/   badge/   button/   card/   date/   dnd/
      dropdown/ input/   modal/    spinner/ tooltip/

  context/
    authContext.tsx  themeContext.tsx  videoContext.tsx  # Providers + contextos
    useAuth.ts       useTheme.ts       useVideo.ts       # Hooks de acesso

  data/
    mockVideos.ts    # Videos mock com tipo Video e enum VideoStatus

  pages/
    home/home.tsx            history/history.tsx
    liked/liked.tsx          login/login.tsx
    playlists/playlists.tsx  profile/profile.tsx
    video/video.tsx          watch/later.tsx

  styles/
    base.css                 # Variaveis CSS, reset, tipografia global
    animations.css           # Keyframes reutilizaveis
    tailwind.css             # Entry point do Tailwind

  utils/
    applyFilters.ts          # VideoFilter class + FilterState + SortBy
    format.ts                # Formatacao de numeros, datas, duracao
    routes.ts                # Constante ROUTES com todos os paths
    storageKeys.ts           # Constante STORAGE_KEYS para localStorage
    tagColors.ts             # Mapeamento de tag -> cor
    themes.ts                # Tipos ThemeColor, ThemeMode
```

---

## Rotas

Definidas em `src/utils/routes.ts` como `ROUTES`. Sempre use essa constante — nunca strings literais de rota no codigo.

```
/             -> HomePage
/login        -> LoginPage   (publica)
/history      -> HistoryPage
/playlists    -> PlaylistsPage
/watch-later  -> WatchLaterPage
/liked        -> LikedPage
/profile      -> ProfilePage (proprio usuario)
/user/:id     -> ProfilePage (outro usuario)
/video/:id    -> VideoPage
/search       -> (busca por query string ?q=)
```

Todas exceto `/login` sao protegidas pelo componente `Guard`.

---

## CSS — convencoes

- Nomenclatura BEM-like: `bloco__elemento--modificador` (ex: `app-header__search-input`, `profile-page__tab--active`).
- Variaveis CSS globais definidas em `src/styles/base.css`: `--accent`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--text`, `--text-2`, `--text-3`, `--radius-sm`, `--radius-md`.
- Suporte a tema claro/escuro via `[data-mode='light']` no `:root`.
- Suporte a cores de acento via `[data-color='violet']`, `[data-color='blue']`, etc.
- Cada componente importa seu proprio `.css` — sem CSS global por componente.
