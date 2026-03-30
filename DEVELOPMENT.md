# Guia de Desenvolvimento — Video Summarizer

> Documentação completa para desenvolver novas funcionalidades no projeto.

**Última atualização:** 2026-03-30

---

## Índice

- [Stack & Ambiente](#stack--ambiente)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Padrões de Código](#padrões-de-código)
- [Processo: Adicionar Nova Funcionalidade](#processo-adicionar-nova-funcionalidade)
- [State Management](#state-management)
- [Componentes & UI](#componentes--ui)
- [Testes](#testes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)
- [Recursos Úteis](#recursos-úteis)

---

## Stack & Ambiente

### Versões

```
Node:                20.20.0+
npm:                 10.x
React:               19.2.0
TypeScript:          5.9.3
Vite:                7.2.5 (rolldown-vite)
Redux Toolkit:       2.11.2
Tailwind CSS:        4.2.1
ESLint:              9.39.1 (flat config)
Vitest:              4.1.2
```

### Setup Inicial

```bash
# Clone e instale dependências
git clone <repo>
cd frontend
npm ci

# Inicie desenvolvimento
npm run dev          # localhost:5173
npm run test:watch  # modo watch
npm run lint        # validar código
```

### Variáveis de Ambiente

Nenhuma variável de ambiente é necessária no frontend — ele comunica com `http://backend:8000` via `axios` com credenciais (Sanctum).

---

## Estrutura do Projeto

### Árvore Simplificada

```
frontend/src/
├── App.tsx              ← Roteamento + providers
├── main.tsx             ← Entry point
│
├── api/                 ← Chamadas HTTP (axios)
│   ├── client.ts        → Instância axios com Sanctum
│   └── videos.ts        → Endpoints de vídeo
│
├── components/          ← 48 componentes
│   ├── ui/              → 17 primitivos reutilizáveis
│   ├── video/           → Player, card, row, etc.
│   ├── header/          → AppHeader
│   ├── sidebar/         → Navegação
│   └── [etc]
│
├── context/             ← Context API + hooks de acesso
│   ├── authContext.tsx
│   ├── themeContext.tsx
│   ├── searchContext.tsx
│   └── useVideo.ts      ← Hook central
│
├── hooks/               ← 17 custom hooks
│   ├── useVideo.ts      → Acesso a vídeos
│   ├── useAuth.ts       → Autenticação
│   ├── useTheme.ts      → Tema/idioma
│   └── [etc]
│
├── pages/               ← 12 páginas
│   ├── home/
│   ├── video/
│   ├── shorts/
│   └── [etc]
│
├── store/               ← Redux slices (7)
│   ├── index.ts         → Configuração
│   ├── types.ts         → RootState, AppDispatch
│   ├── videoSlice.ts    → State de vídeos
│   ├── authSlice.ts     → Auth state
│   └── [etc]
│
├── types/               ← Domain models (branded types)
│   ├── video.ts         → Video, VideoId
│   ├── channel.ts       → Channel, ChannelId
│   └── [etc]
│
├── utils/               ← Utilities
│   ├── applyFilters.ts  → VideoFilter class
│   ├── format.ts        → Formatação
│   ├── cn.ts            → Class names
│   └── [etc]
│
├── data/                ← Mock data
│   ├── mockVideos.ts
│   └── themeConfig.ts
│
└── styles/              ← CSS global
    ├── base.css
    └── animations.css
```

### Aliases de Importação

```typescript
@context/*    // src/context
@components/* // src/components
@ui          // src/components/ui (barrel)
@ui/*        // src/components/ui/*
@pages/*     // src/pages
@hooks/*     // src/hooks
@store       // src/store
@models/*    // src/types (domain DTOs)
@utils/*     // src/utils
@data/*      // src/data
```

**Importante:** Componentes dentro de `@ui/` usam imports relativos para evitar dependência circular.

---

## Padrões de Código

### 1. Componentes

#### Estrutura Base

```typescript
import { memo } from 'react';
import type { ReactNode } from 'react';

// 1. Props interface no topo
interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary';
    onClick?: () => void;
    disabled?: boolean;
}

// 2. Componente como função nomeada (nunca arrow function no export default)
export default function Button({
    children,
    variant = 'primary',
    onClick,
    disabled = false,
}: ButtonProps) {
    // 3. Implementação
    const handleClick = () => {
        if (!disabled) onClick?.();
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={['btn', `btn--${variant}`].filter(Boolean).join(' ')}
        >
            {children}
        </button>
    );
}

// 4. Memoizar quando apropriado (componentes com props complexas)
export default memo(Button);
```

#### Nomear Componentes

```typescript
// ✅ Multi-word: folder/file.tsx
components/video/card.tsx          // export default VideoCard
components/tag/input.tsx           // export default TagInput
components/filter/panel.tsx        // export default FilterPanel

// ✅ Single-word: folder/folder.tsx
components/header/header.tsx       // export default Header
components/sidebar/sidebar.tsx     // export default Sidebar
components/guard/guard.tsx         // export default Guard
```

#### CSS Acompanha Componente

```
components/
├── video/
│   ├── card.tsx
│   └── card.css          ← Mesmo nome
├── header/
│   ├── header.tsx
│   └── header.css        ← Mesmo nome
```

### 2. Props & Interfaces

```typescript
// ❌ Evite prop drilling profundo
<VideoCard video={video} dispatch={dispatch} store={store} />

// ✅ Use hooks para acesso a state
export default function VideoCard({ video }: { video: Video }) {
    const dispatch = useAppDispatch();
    const likedSet = useAppSelector(selectLikedSet);

    return <div>{video.title}</div>;
}
```

### 3. Nomes com Lógica Booleana

```typescript
// ❌ Evite expressões brutas
if (video.status === VideoStatus.PUBLISHED && video.views > 1000) { }

// ✅ Extraia em variável nomeada
const isPublished = video.status === VideoStatus.PUBLISHED;
const isPopular = video.views > 1000;
if (isPublished && isPopular) { }
```

### 4. Construir Classes CSS

```typescript
// ✅ Array + filter + join
const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    isActive ? 'btn--active' : '',
    className,
].filter(Boolean).join(' ');
```

### 5. Structured Concurrency (Early Return)

```typescript
// ❌ Evite nesting profundo
function handler() {
    if (isValid) {
        if (isAuthorized) {
            doSomething();
        }
    }
}

// ✅ Retorne cedo
function handler() {
    if (!isValid) return;
    if (!isAuthorized) return;
    doSomething();
}
```

### 6. Tipos Branded (Type Safety)

```typescript
// Em src/types/video.ts
export type VideoId = string & { readonly __brand: 'VideoId' };
export const vid = (s: string): VideoId => s as VideoId;

// Uso seguro
const id = vid('video-123');
const otherId = 'string-456'; // ❌ TypeScript error — não é VideoId
```

---

## Processo: Adicionar Nova Funcionalidade

### 1️⃣ Planejamento

Faça as perguntas:

```
□ Qual é o escopo (componente? nova página? novo slice Redux?)
□ Onde vive o estado (Redux? Context? Local?)
□ Precisa de nova rota?
□ Precisa de nova chamada API?
□ Qual é o fluxo de interação?
□ Acessibilidade? (aria-labels, keyboard nav, ARIA roles)
□ i18n? (adicionar strings em pt.json e en.json)
```

### 2️⃣ Crie o Componente

Comece com a UI, depois a lógica:

```typescript
// components/video/newFeature.tsx

interface NewFeatureProps {
    videoId: VideoId;
    onComplete?: () => void;
}

export default function NewFeature({ videoId, onComplete }: NewFeatureProps) {
    // 1. Hooks (custom + built-in)
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    // 2. State
    const [isLoading, setIsLoading] = useState(false);

    // 3. Handlers
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await dispatch(someAction(videoId)).unwrap();
            onComplete?.();
        } finally {
            setIsLoading(false);
        }
    };

    // 4. Render
    return (
        <div className="new-feature">
            <h2>{t('feature.title')}</h2>
            <Button onClick={handleSubmit} loading={isLoading}>
                {t('feature.action')}
            </Button>
        </div>
    );
}
```

### 3️⃣ Se Precisa de State Global (Redux)

Crie um slice:

```typescript
// store/featureSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './types';

interface FeatureState {
    items: string[];
    isLoading: boolean;
    error: string | null;
}

const initialState: FeatureState = {
    items: [],
    isLoading: false,
    error: null,
};

const featureSlice = createSlice({
    name: 'feature',
    initialState,
    reducers: {
        addItem: (state, action: PayloadAction<string>) => {
            state.items.push(action.payload);
        },
        removeItem: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(i => i !== action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const featureActions = featureSlice.actions;
export default featureSlice;

// Selector (memoizado)
export const selectFeatureItems = (state: RootState) => state.feature.items;
```

Registre no `store/index.ts`:

```typescript
export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        video: videoSlice.reducer,
        feature: featureSlice.reducer,  // ← Nova
        // ...
    },
});
```

### 4️⃣ Crie um Hook para Usar o Slice

```typescript
// hooks/useFeature.ts

import { useAppDispatch, useAppSelector } from '@store';
import { featureActions, selectFeatureItems } from '@store/featureSlice';

export function useFeature() {
    const dispatch = useAppDispatch();
    const items = useAppSelector(selectFeatureItems);
    const isLoading = useAppSelector(s => s.feature.isLoading);

    const addItem = useCallback(
        (item: string) => dispatch(featureActions.addItem(item)),
        [dispatch],
    );

    return { items, isLoading, addItem };
}
```

### 5️⃣ Use o Hook no Componente

```typescript
export default function FeatureContainer() {
    const { items, isLoading, addItem } = useFeature();

    return (
        <div>
            {items.map(item => (
                <div key={item}>{item}</div>
            ))}
            <NewFeature onComplete={() => addItem('novo')} />
        </div>
    );
}
```

### 6️⃣ Adicione i18n

```json
// src/i18n/locales/pt.json
{
    "feature": {
        "title": "Novo recurso",
        "action": "Executar",
        "success": "Concluído!"
    }
}

// src/i18n/locales/en.json
{
    "feature": {
        "title": "New feature",
        "action": "Execute",
        "success": "Done!"
    }
}
```

### 7️⃣ Escreva Testes

```typescript
// tests/store/featureSlice.test.ts

import { describe, it, expect } from 'vitest';
import featureSlice, { featureActions } from '@store/featureSlice';

describe('featureSlice — addItem', () => {
    it('adds item to items array', () => {
        const state = { items: [], isLoading: false, error: null };
        const next = featureSlice.reducer(state, featureActions.addItem('test'));
        expect(next.items).toContain('test');
    });
});
```

### 8️⃣ Lint & Commit

```bash
npm run lint:fix    # Auto-fix style issues
npm run lint        # Validar
npm test            # Rodar testes
git add .
git commit -m "feat(feature): adicionar novo recurso X"
```

---

## State Management

### Redux vs Context vs Local

| Tipo | Uso | Exemplo |
|------|-----|---------|
| **Redux (Global)** | Estado compartilhado, persistido, sincronizado entre abas | Videos, auth, temas |
| **Context (Semi-Global)** | Acesso a refs, callbacks compartilhados | SearchContext (ref do input) |
| **Local (useState)** | Estado temporário, interfaz local | isModalOpen, isLoading |

### Redux Architecture

```
Store (Redux):
├── auth/              ← User, isAuthenticated
├── video/             ← Videos, history, liked, etc.
├── theme/             ← mode, color, language
├── playlist/          ← User playlists
├── subscription/      ← Subscribed channels
├── search/            ← Search results (?)
└── toast/             ← Notifications queue

Middleware:
├── persistMiddleware  ← Salva selectedSlices em localStorage
└── crossTabSync      ← Sincroniza entre abas via window.storage event
```

### Criar Seletor Memoizado

```typescript
// Em um slice
import { createSelector } from '@reduxjs/toolkit';

export const selectLikedSet = createSelector(
    (state: RootState) => state.video.likedVideos,
    (likedVideos) => new Set(likedVideos),
);

// Uso
const likedSet = useAppSelector(selectLikedSet);
// Só recalcula se likedVideos mudar
```

---

## Componentes & UI

### UI Primitivos Disponíveis

```typescript
import {
    Button,
    Input,
    Modal,
    Tooltip,
    Avatar,
    Badge,
    Card,
    Dropdown,
    Spinner,
    Empty,
} from '@ui';
```

### Button

```typescript
// Variantes: primary | secondary | ghost | danger
// Tamanhos: sm | md | lg | icon
// Estados: loading, disabled, fullWidth

<Button variant="primary" size="md" onClick={...}>
    Save
</Button>

// Icon-only (obrigatório: aria-label + Tooltip)
<Tooltip content="Close">
    <Button size="icon" aria-label="Close" onClick={...}>
        <X size={14} />
    </Button>
</Tooltip>
```

### Input

```typescript
<Input
    type="text"
    placeholder="Search..."
    value={value}
    onChange={(e) => setValue(e.target.value)}
    icon={<Search size={14} />}
    error="Email is invalid"
    disabled={isSubmitting}
/>
```

### Modal

```typescript
<Modal isOpen={open} onClose={setOpen} title="Confirm">
    <p>Are you sure?</p>
    <div style={{ display: 'flex', gap: '1rem' }}>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
    </div>
</Modal>
```

### Tooltip (Radix UI)

```typescript
import { Tooltip } from '@ui';

<Tooltip content="Tooltip text" side="right">
    <button>Hover me</button>
</Tooltip>
```

### Acessibilidade (WCAG 2.1 AA)

```typescript
// Toggle button
<Button
    aria-pressed={isActive}
    onClick={() => setActive(!isActive)}
>
    {isActive ? 'On' : 'Off'}
</Button>

// Menu trigger
<button
    aria-expanded={open}
    aria-haspopup="listbox"
    onClick={() => setOpen(!open)}
>
    Menu
</button>

// Icon-only (obrigatório aria-label)
<Button
    size="icon"
    aria-label="Close sidebar"
    onClick={toggleSidebar}
>
    <Menu size={20} />
</Button>
```

---

## Testes

### Tipos de Testes

| Tipo | Descrição | Exemplos |
|------|-----------|----------|
| **Unit** | Testa função/classe isolada | VideoFilter.apply(), Format.duration() |
| **Integration** | Testa slice Redux com reducers | videoSlice (add, edit, like) |
| **Component** | Testa componente React (NÃO feito) | VideoCard renderização |
| **E2E** | Testa fluxo completo (NÃO feito) | Login → Upload → Watch |

### Setup Vitest

```typescript
// vitest.config.ts está configurado para:
// - jsdom environment (para localStorage, DOM APIs)
// - Aliases resolvidas (@utils, @store, etc)
// - Pattern: tests/**/*.test.ts

// Executar:
npm test              // Rodar uma vez
npm run test:watch   // Watch mode
npm run test:ui      // Dashboard visual
```

### Escrever Teste Unitário

```typescript
import { describe, it, expect } from 'vitest';

describe('VideoFilter.apply', () => {
    it('filters videos by tag when tag is selected', () => {
        const videos = [
            { id: 'v1', tags: ['react'] },
            { id: 'v2', tags: ['css'] },
        ];
        const filter = { tags: ['react'], sortBy: 'recent' };

        const result = VideoFilter.apply(videos, filter);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('v1');
    });
});
```

### Testar Redux Slice

```typescript
import { describe, it, expect } from 'vitest';
import videoSlice, { videoActions } from '@store/videoSlice';

describe('videoSlice — addVideo', () => {
    it('adds video to videos array', () => {
        const state = { videos: [], watchHistory: [], ... };
        const video = { title: 'Test', ... };

        const next = videoSlice.reducer(
            state,
            videoActions.addVideo(video),
        );

        expect(next.videos).toHaveLength(1);
        expect(next.videos[0].title).toBe('Test');
    });
});
```

### Coverage Alvo

```
Target: 70% (atualmente ~8%)

Priority:
1. Redux slices (reducers + selectors) — CRÍTICO
2. Utils (filters, format, storage) — ALTO
3. Hooks (useVideo, useAuth) — MÉDIO
4. Components (VideoCard, Header, etc) — BAIXO (requer RTL)
```

---

## CI/CD Pipeline

### GitHub Actions: `frontend.yml`

```yaml
Trigger:    Push/PR para main (paths: frontend/**)
Node:       22.x com cache npm
Steps:
  1. Checkout
  2. npm ci (clean install)
  3. tsc --noEmit (type check)
  4. npm run lint (ESLint)
  5. npm test (Vitest)
  6. npm audit --audit-level=high (security)

Status: ALL must PASS antes de merge
```

### Comandos Locais (Mirror CI)

```bash
# Simule o CI localmente
tsc --noEmit                    # Type check
npm run lint                    # Lint check
npm test                        # Unit tests
npm audit --audit-level=high   # Audit

# Ou tudo de uma vez:
npm run build                   # Compila tudo
```

### Fazer Commit Seguro

```bash
# 1. Stage seu código
git add .

# 2. Lint auto-fix
npm run lint:fix

# 3. Type check
tsc --noEmit

# 4. Testes
npm test

# 5. Se tudo passar, commit
git commit -m "feat(component): descrição"

# 6. Push
git push origin feature-branch
```

---

## Troubleshooting

### "Property does not exist on type"

```typescript
// ❌ Esqueceu de adicionar campo na interface
interface Video {
    title: string;
}
video.duration  // ❌ TypeScript error

// ✅ Adicione o campo
interface Video {
    title: string;
    duration?: number;  // ← Adicione
}
```

### "ESLint error: no-nested-ternary"

```typescript
// ❌ Nested ternary
const icon = isLoading ? <Spinner /> : isError ? <X /> : <Check />;

// ✅ Extract to variable
let icon;
if (isLoading) { icon = <Spinner />; }
else if (isError) { icon = <X />; }
else { icon = <Check />; }
```

### "ESLint error: no-else-return"

```typescript
// ❌ Else after return
function check() {
    if (isValid) {
        return true;
    } else {
        return false;
    }
}

// ✅ Early return
function check() {
    if (isValid) { return true; }
    return false;
}
```

### "Cannot access refs during render"

```typescript
// ❌ Ler ref durante render
const virtualizer = useWindowVirtualizer({
    scrollMargin: listRef.current?.offsetTop ?? 0,  // ❌ Render
});

// ✅ Usar eslint-disable comment
/* eslint-disable react-hooks/refs */
const virtualizer = useWindowVirtualizer({
    scrollMargin: listRef.current?.offsetTop ?? 0,
});
/* eslint-enable react-hooks/refs */
```

### "Module not found: @utils/xyz"

```bash
# 1. Verifique se o arquivo existe
ls src/utils/xyz.ts

# 2. Verifique path alias em vite.config.ts
# Aliases devem estar em:
# - vite.config.ts (resolve.alias)
# - tsconfig.app.json (compilerOptions.paths)
# - eslint.config.js (test.alias)
```

### "Hydration mismatch"

```typescript
// ❌ Renderização diferente entre server e client
const date = new Date().toISOString();  // Muda entre renders

// ✅ Garanta estado estável
const [date, setDate] = useState<string | null>(null);

useEffect(() => {
    setDate(new Date().toISOString());
}, []);

if (!date) return <div>Loading...</div>;
return <div>{date}</div>;
```

---

## Recursos Úteis

### Documentação

- **React 19:** https://react.dev
- **Vite:** https://vitejs.dev
- **Redux Toolkit:** https://redux-toolkit.js.org
- **TypeScript:** https://www.typescriptlang.org/docs
- **Vitest:** https://vitest.dev
- **i18next:** https://www.i18next.com
- **Tailwind CSS:** https://tailwindcss.com

### Arquivos Importantes

```
📄 /frontend/CLAUDE.md                — Conventions & UI system
📄 /frontend/eslint.config.js          — Linting rules
📄 /frontend/vite.config.ts            — Build config
📄 /frontend/tsconfig.app.json         — TypeScript config
📄 /.github/workflows/frontend.yml    — CI/CD pipeline
📄 /DEVELOPMENT.md                    — Este arquivo
📄 /application.md                    — Backend + architecture
```

### Atalhos Úteis

```bash
# Development
npm run dev              # Inicia servidor
npm run lint:fix       # Auto-corrige
npm run test:watch    # Watch tests
npm run build         # Production build

# Debugging
npm run test:ui       # Vitest UI dashboard
npm run preview       # Preview prod build
```

### Contato

Perguntas ou issues? Abra um ticket ou consulte `/frontend/CLAUDE.md` para conventions específicas.

---

**FIM DO GUIA**
