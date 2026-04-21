# Frontend Documentation Setup

A documentação do frontend é gerada automaticamente pelo **TypeDoc** a partir dos types, interfaces, classes e hooks.

## Como Gerar

```bash
npm run docs      # Gera uma vez
npm run docs:watch # Gera em watch mode (regenera ao salvar)
```

## Saída

A documentação é gerada na pasta `docs/` (ignorada no git).

Abra `docs/index.html` no navegador para visualizar.

## O que é Documentado

**Entrada (entryPoints):**
- `src/api/index.ts` — Classes de API (auth, video, channel, playlist, history, interactions)
- `src/types/index.ts` — Tipos e interfaces (User, Video, Playlist, etc.)
- `src/hooks/index.ts` — React hooks customizados (useAuth, useVideo, useTheme, etc.)
- `src/context/index.ts` — React Context e hooks de context

**Excluído:**
- Componentes React (páginas, componentes de UI)
- Configurações internas
- Utilitários puros (por design, hooks e APIs são mais relevantes)

## Estrutura da Documentação

```
docs/
├── index.html              # Página inicial (README.md renderizado)
├── modules.html            # Lista de módulos (API, Types, Hooks, Context)
├── modules/
│   ├── api_index.html
│   ├── types_index.html
│   ├── hooks_index.html
│   └── context_index.html
├── interfaces/             # Interfaces (User, Video, Playlist, etc.)
├── types/                  # Type definitions
└── functions/              # Funções
```

## Padrão de Documentação

Use JSDoc para documentar suas classes, métodos, interfaces:

```typescript
/**
 * Fetches a list of videos with optional filtering.
 * 
 * @param params - Filter parameters
 * @param params.page - Page number (default: 1)
 * @param params.perPage - Items per page (default: 15)
 * @returns Promise resolving to videos array or null on error
 */
async list(params?: {
    page?: number
    perPage?: number
}): Promise<VideoListResponse | null> {
    // ...
}
```

## CI/CD

Para adicionar docs na pipeline, execute `npm run docs` no build step e faça upload para um servidor estático (GitHub Pages, Netlify, S3, etc.).

Exemplo GitHub Actions:

```yaml
- name: Generate Docs
  run: npm run docs

- name: Upload Docs
  uses: actions/upload-artifact@v3
  with:
    name: frontend-docs
    path: frontend/docs/
```

## Dicas

- Não precisa documentar componentes React aqui — a documentação foca em APIs, tipos e hooks reutilizáveis
- Use `@deprecated` se descontinuar uma API
- Use `@example` para exemplos de uso
- TypeDoc extrai tipos automaticamente — adicione comentários JSDoc para clareza adicional
