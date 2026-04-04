# Frontend — Guia de Codigo Limpo

Principios praticos para escrever codigo de qualidade no frontend deste projeto. Baseado em padroes reais aplicados na codebase.

---

## 1. Cada conhecimento vive em exatamente um lugar

Se uma funcao, tipo, constante ou padrao aparece em mais de um arquivo, ela precisa ser extraida.

```
// Ruim: formatTime duplicada em playerDefault.tsx e playerSeekBar.tsx
function formatTime(s: number): string { ... }

// Bom: vive em utils/format.ts, importada por quem precisa
import { Format } from '@utils/format';
Format.duration(seconds);
```

O mesmo vale para tipos e constantes:

```ts
// Ruim: tipo definido em 3 arquivos diferentes
type SkipIndicator = { dir: 'fwd' | 'bwd'; count: number; key: number };

// Bom: definido uma vez em playerTypes.ts, importado por todos
import type { SkipIndicator } from './playerTypes';
```

**Regra**: antes de definir algo, faca grep. Se ja existe, importe. Se existe em 2+ lugares, extraia para um lugar so.

---

## 2. Componentes sao finos — orquestram hooks e renderizam JSX

Um componente nao deve gerenciar timers, event listeners do document, ou logica complexa de estado inline. Ele deve:
1. Chamar hooks
2. Definir handlers curtos que conectam hooks entre si
3. Retornar JSX

```tsx
// Ruim: 6 useEffects, timers, refs, logica de fullscreen inline — tudo no corpo do componente (424 linhas)

// Bom: cada responsabilidade em seu hook (246 linhas)
export function DefaultVideoPlayer({ ... }) {
    const controls = usePlayerControls(videoRef);
    const playback = usePlayerPlayback(videoRef, { ... });
    const { popIcon, showPopIcon } = usePopIcon();
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

    useVolumeWheel(containerRef, videoRef, playback.applyVolume, controls.revealControls);
    useOutsideClick(settingsRef, () => setShowSettings(false));
    usePlayerKeyboard({ videoRef, onTogglePlay: handleTogglePlay, ... });

    // handlers curtos que conectam hooks
    function handleTogglePlayWithFeedback() { ... }

    return ( /* JSX */ );
}
```

**Sinais de que o componente precisa ser refatorado**:
- Mais de 3 `useEffect` no corpo
- `useRef` para timers manuais
- `document.addEventListener` inline
- `// eslint-disable-next-line complexity`
- Mais de 250 linhas

---

## 3. Quando extrair um hook

Extraia um hook quando a logica:
- **Aparece em 2+ componentes** (ex: `usePopIcon` — timer de animacao identico em playerDefault e shortPlayer)
- **E um useEffect auto-contido** com setup + cleanup (ex: `useFullscreen` — listener de `fullscreenchange` + toggle)
- **Gerencia um timer** com ref + state + cleanup (ex: `useSkipIndicator`, `useClickDoubleClick`)
- **Acopla um event listener ao document/window** (ex: `useVolumeWheel`, `useOutsideClick`)

**NAO extraia** quando:
- A logica e usada em 1 lugar so E tem menos de 10 linhas
- E apenas um `useState` + handler simples (ex: `showSettings` toggle)
- A extracao criaria um hook que so repassa props (abstraction for abstraction's sake)

---

## 4. Hooks ja existentes devem ser reutilizados

Antes de escrever logica de estado num componente, verifique se ja existe um hook que faz isso.

```tsx
// Ruim: ShortPlayer reimplementa 60 linhas de state que usePlayerPlayback ja fornece
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [isBuffering, setIsBuffering] = useState(false);
// + 5 useCallbacks para event handlers...

// Bom: reutiliza o hook existente
const { isPlaying, isBuffering, progressPct, handleVideoPlay, ... } = usePlayerPlayback(videoRef, { ... });
```

Se o hook existente nao suporta o seu caso de uso, **flexibilize o hook** (parametros opcionais, opcoes de configuracao) em vez de reimplementar.

---

## 5. Hooks flexiveis com opcoes opcionais

Quando um hook precisa servir variantes diferentes, use um objeto de opcoes com campos opcionais em vez de parametros posicionais obrigatorios.

```ts
// Ruim: parametros obrigatorios que nem todo consumer precisa
export function usePlayerPlayback(
    videoRef, callbacks, scheduleHideControls, forceShowControls
) { ... }
// MiniPlayer e forcado a passar () => {} para os ultimos dois

// Bom: objeto de opcoes com campos opcionais
interface PlayerPlaybackOptions {
    callbacks: PlayerCallbacks;
    scheduleHideControls?: () => void;
    forceShowControls?: () => void;
    controlledMuted?: boolean;
    controlledVolume?: number;
}
export function usePlayerPlayback(videoRef, options: PlayerPlaybackOptions) { ... }
```

---

## 6. Padrao cbRef para callbacks estaveis em hooks

Quando um hook recebe callbacks que podem mudar de identidade a cada render, armazene-os em um ref para evitar re-runs do useEffect:

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
    }, [containerRef, videoRef]); // deps estaveis — sem re-run
}
```

---

## 7. Nomes consistentes entre componentes

O mesmo conceito deve ter o mesmo nome em todos os arquivos.

| Conceito | Nome padrao | Evitar |
|---|---|---|
| Alternar play/pause | `handleTogglePlay` | `handlePlayPause`, `handleTogglePlayImmediate` |
| Alternar mute | `handleToggleMute` (componente) / `applyMuteToggle` (hook) | `handleMuteToggle` |
| Toggle com feedback visual | `handleTogglePlayWithFeedback` | misturar logica de feedback dentro do toggle base |
| Handler de botao com stopPropagation | `handleTogglePlayBtn` | mesmo nome do handler base |

**Padrao para feedback visual**: o hook fornece a acao pura (`handleTogglePlay`), o componente envolve com feedback:

```ts
function handleTogglePlayWithFeedback() {
    const wasPaused = videoRef.current?.paused ?? true;
    handleTogglePlay();
    showPopIcon(wasPaused ? 'play' : 'pause');
}
```

---

## 8. Arquivos moram onde fazem sentido arquitetural

Um componente que usa classes CSS `vp__*` de `player.css`, importa `player.css`, e e uma variante de player — pertence a `components/player/`, nao a `components/video/`.

Convencao de nomes dentro de `player/`:

```
player/
  player.tsx          # Wrapper que alterna entre variantes
  player.css          # Estilos compartilhados (BEM: vp__)
  playerDefault.tsx   # Player completo com controles
  playerMini.tsx      # Player minimal (overlay + progress)
  playerShort.tsx     # Player vertical para Shorts
  playerSeekBar.tsx   # Seek bar com preview/chapters
  playerOverlays.tsx  # Buffering, pop icon, skip indicator
  playerSettings.tsx  # Painel de velocidade
  playerTypes.ts      # Tipos e constantes compartilhadas
```

---

## 9. Separacao: logica pura vs logica com side-effect

- **Utils** (`utils/`): funcoes puras, sem hooks, sem DOM. Ex: `Format.duration()`, `isTypingInInput()`, `applyFilters()`
- **Hooks** (`hooks/`): funcoes com `use*`, gerenciam state/effects/refs. Ex: `useFullscreen()`, `usePopIcon()`
- **Types** (`playerTypes.ts` ou `types/`): tipos e constantes. Sem logica.

Nunca coloque `useState` ou `useEffect` numa funcao que nao comece com `use`.

---

## 10. Checklist antes de submeter codigo

1. **Grep antes de criar**: a funcao/tipo/constante ja existe em outro lugar?
2. **Hook antes de useEffect**: esse efeito e auto-contido o suficiente para virar um hook? Ele aparece em outro componente?
3. **Nomes alinhados**: o nome do handler e consistente com o mesmo conceito em outros componentes?
4. **i18n**: tem string hardcoded? Usa `t('chave')` em vez de literal?
5. **Componente fino**: o componente tem mais de 250 linhas? Mais de 3 useEffects? Precisa de `eslint-disable complexity`?
6. **Imports corretos**: usa path alias (`@hooks/`, `@utils/`) e nao caminho relativo longo?
7. **Tipo compartilhado**: o tipo e usado em 2+ arquivos? Ele esta num arquivo de tipos dedicado?
