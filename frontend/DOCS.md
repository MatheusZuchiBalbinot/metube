# Vidsum — Frontend Documentation

Bem-vindo à documentação do frontend do Vidsum. Este documento descreve a arquitetura, padrões e APIs disponíveis.

## Navegação Rápida

- **[API Client](docs/modules/api_index.html)** — Classes e métodos para comunicação com backend
- **[Tipos & Interfaces](docs/modules/types_index.html)** — Modelos de domínio (User, Video, Playlist, etc.)
- **[Hooks Customizados](docs/modules/hooks_index.html)** — React hooks para estado e efeitos
- **[Context](docs/modules/context_index.html)** — React Context para estado global

## Estrutura do Projeto

```
src/
├── api/                    # Cliente HTTP estruturado por domínio
│   ├── client.ts          # ApiClient base (get, post, patch, put, delete)
│   ├── auth.ts            # AuthApi (login, logout, me, updateProfile)
│   ├── videos.ts          # VideoApi (CRUD + interações)
│   ├── history.ts         # HistoryApi (watch history)
│   ├── interactions.ts     # InteractionsApi (likes, saves)
│   ├── channels.ts        # ChannelApi (channel profile, subscriptions)
│   ├── playlists.ts       # PlaylistApi (CRUD de playlists)
│   └── index.ts           # Barrel export
│
├── types/                 # TypeScript types & interfaces (DTOs)
│   ├── user.ts           # User
│   ├── video.ts          # Video, VideoStatus, Vuid
│   ├── channel.ts        # Channel
│   ├── playlist.ts       # Playlist
│   ├── tag.ts            # Tag
│   ├── common.ts         # PaginatedResponse
│   └── index.ts          # Barrel export
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication state
│   ├── useVideo.ts       # Video operations & state
│   ├── useTheme.ts       # Theme management
│   ├── usePlaylist.ts    # Playlist operations
│   ├── useVideoProgress/ # Video progress tracking
│   ├── usePlayerPlayback/# Player playback controls
│   ├── usePlayerKeyboard/# Keyboard shortcuts
│   └── ... (20+ hooks)
│
├── context/              # React Context
│   ├── searchContext.tsx # Search context
│   └── useSearch.ts      # useSearch hook
│
├── components/           # React components
│   ├── ui/              # Primitives (Button, Modal, etc.)
│   ├── header/          # App header
│   ├── sidebar/         # Navigation sidebar
│   ├── player/          # Video player
│   ├── video/           # Video components
│   └── ...
│
├── pages/               # Page components (routed)
│   ├── home/
│   ├── video/
│   ├── channel/
│   ├── playlists/
│   └── ...
│
├── store/               # Redux state management
│   ├── videoSlice.ts
│   ├── authSlice.ts
│   ├── themeSlice.ts
│   └── ...
│
├── utils/               # Utility functions
├── styles/              # Global CSS
└── i18n/                # Internationalization
```

## Padrões de Código

### API Client

Cada domínio tem sua própria classe API com um `baseUrl` centralizado:

```typescript
import { auth, video, channel, playlist } from '@api';

// Usage
const user = await auth.me();
if (!user) {
    // Erro ou sem dados
    return;
}

const videos = await video.list({ page: 1, tags: ['react'] });
const subs = await channel.subscriptions();
const playlists = await playlist.list();
```

**Padrão de retorno**: Todas as chamadas retornam `T | null`:
- Sucesso: retorna os dados
- Erro (rede, validação, servidor): retorna `null` e loga o erro

### Tipagem

Todos os tipos são branded types para maior segurança:

```typescript
type Uuid = string & { readonly _brand: 'Uuid' };      // User ID
type Vuid = string & { readonly _brand: 'Vuid' };      // Video ID
type Puid = string & { readonly _brand: 'Puid' };      // Playlist ID
```

### Hooks

Hooks customizados encapsulam lógica complexa:

```typescript
// useVideo — CRUD de vídeos, filters, progresso, mini-player
const { videos, loading, filter } = useVideo();

// useAuth — autenticação e usuário logado
const { user, isLoggedIn, login, logout } = useAuth();

// useTheme — tema e cor de acento
const { mode, color, setMode, setColor } = useTheme();
```

## Rotas de API

### Base URL
Todas as rotas têm base URL `/api` (configurado em `ApiClient`).

### Auth
```
POST   /auth/login              — Login
POST   /auth/logout             — Logout
GET    /auth/me                 — Usuário autenticado
PATCH  /auth/me                 — Atualizar perfil
```

### Vídeos
```
GET    /videos                  — Listar (paginado, filtros)
POST   /videos                  — Upload de vídeo
GET    /videos/{vuid}           — Detalhe
PATCH  /videos/{vuid}           — Editar metadados
DELETE /videos/{vuid}           — Deletar
POST   /videos/{vuid}/views     — Registrar visualização
POST   /videos/{vuid}/like      — Toggle curtida
POST   /videos/{vuid}/dislike   — Toggle descurtida
POST   /videos/{vuid}/save      — Toggle save (watch later)
PUT    /videos/{vuid}/progress  — Atualizar progresso
GET    /videos/{vuid}/summary   — Resumo + capítulos
```

### Histórico & Interações
```
GET    /users/me/history              — Histórico de assistidos
GET    /users/me/history/events       — Eventos (para heatmap)
DELETE /users/me/history              — Limpar tudo
DELETE /users/me/history/{vuid}       — Remover item
GET    /users/me/likes                — Vídeos curtidos
GET    /users/me/saved                — Vídeos salvos
```

### Canais
```
GET    /channels/{uuid}               — Perfil do canal
GET    /channels/{uuid}/videos        — Vídeos do canal
POST   /channels/{uuid}/subscription  — Toggle inscrição
GET    /users/me/subscriptions        — Canais inscritos
```

### Playlists
```
GET    /playlists                     — Listar do usuário
POST   /playlists                     — Criar
PATCH  /playlists/{puid}              — Renomear
DELETE /playlists/{puid}              — Deletar
POST   /playlists/{puid}/videos       — Adicionar vídeo
DELETE /playlists/{puid}/videos/{vuid} — Remover vídeo
PUT    /playlists/{puid}/videos       — Reordenar
```

## Convenções

### Nomenclatura de Arquivos
- **camelCase**: `useVideo.ts`, `mockVideos.ts`
- **Componentes multi-palavra**: `pasta/componente.tsx` (ex: `filter/panel.tsx`)
- **Componentes uma palavra**: `pasta/pasta.tsx` (ex: `header/header.tsx`)

### Early Return
Sempre retorne cedo. Caminho feliz no menor nível de indentação.

```typescript
function handleSubmit() {
    const isTitleEmpty = title.trim() === '';
    if (isTitleEmpty) return;
    
    saveVideo();
    onClose();
}
```

### Condições Booleanas Nomeadas
Extraia condições em variáveis com prefixos: `is`, `has`, `should`, `can`.

```typescript
const isAlreadyFirst = prev[0] === videoId;
if (isAlreadyFirst) return prev;
```

### Imports & Aliases
```typescript
import { video, auth, channel } from '@api';
import { Video, Vuid } from '@models/video';
import { useVideo } from '@hooks/useVideo';
import { Button } from '@ui/button/button';
```

## Acessibilidade

- Botões com ícone + texto: label vem do texto
- Botão só com ícone: obrigatório `aria-label` + `<Tooltip>`
- Toggle buttons: `aria-pressed={isActive}`
- Dropdowns: `aria-expanded={open}` + `aria-haspopup="true"`

## Performance

- React Compiler otimiza re-renders
- Lazy loading de componentes via React.lazy
- Memoization com useMemo/useCallback onde apropriado
- Code splitting automático pelo Vite

## Testes

- Vitest para testes unitários
- React Testing Library para testes de componentes
- Cypress para testes E2E

## Build & Deploy

```bash
npm run build    # Vite build
npm run preview  # Preview da build
npm run lint     # ESLint
```

## Mais Informações

Veja os módulos documentados acima para detalhes completos sobre cada parte do projeto.
