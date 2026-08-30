# MeTube — Frontend

SPA React 19 + TypeScript para o [MeTube](../README.md): arquitetura orientada a hooks, lógica de domínio pura separada da renderização, e Redux Toolkit para estado global.

Convenções completas (aliases, ESLint, Redux, testes): [`CLAUDE.frontend.md`](CLAUDE.frontend.md).

## Requisitos

* Node.js 22

## Setup

Dentro de `frontend/`:

```bash
npm install
npm run dev   # Vite dev server com HMR, em http://localhost:5173
```

Para rodar junto com o restante da stack (backend, Postgres, Redis), use `npm run start` na raiz do repo em vez do dev server isolado — ver [README raiz](../README.md#como-rodar).

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (Vite)
npm run build         # type-check (tsc -b) + build de produção
npm test               # Vitest
npm run test:watch     # Vitest em watch mode
npm run lint            # ESLint
npm run lint:fix        # ESLint --fix
npm run lint:css        # Stylelint
```

> O bundler é [rolldown-vite](https://vite.dev/guide/rolldown), um fork experimental do Vite sobre o bundler Rolldown — pin deliberado em `package.json` (`"vite": "npm:rolldown-vite@..."`), não acidental.

## Estrutura

```text
src/
├── api/          Clientes HTTP + parsers de resposta
├── components/   Componentes compartilhados (player, upload, video, ui/...)
├── pages/        Páginas, cada uma com seus hooks locais em hooks/
├── hooks/        Hooks globais (realtime, progresso, atalhos de teclado, ...)
├── store/        Redux Toolkit — slices + selectors memoizados
├── domain/       Lógica de negócio pura, sem efeitos colaterais nem dependência de React
├── utils/         Funções puras compartilhadas
└── types/         Branded types (VideoId, Vuid, Puid, ...)
```

Detalhes de aliases (`@components`, `@hooks`, `@utils`, ...), convenções de teste e estrutura de estado: [`CLAUDE.frontend.md`](CLAUDE.frontend.md).
