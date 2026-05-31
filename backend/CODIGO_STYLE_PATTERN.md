# Seu Padrão de Código - Análise Antes vs Depois

## ❌ ANTES (Anti-pattern)

```php
// 1. Parâmetros genéricos (array sem tipo específico)
public function listVideos(array $filters): LengthAwarePaginator
{
    $hasFilters = isset($filters['search']) || isset($filters['tags']) || isset($filters['status']);
    if ($hasFilters) {
        return $this->queryVideos($filters);
    }

    $page = (int) ($filters['page'] ?? 1);
    
    // 2. Closure inline dentro da chamada (RUIM)
    return $this->cache->rememberFeed($page, fn () => $this->queryVideos($filters));
}

// 3. Closure inline como parâmetro (RUIM)
public function getVideoByUuid(string $vuid): Video
{
    return $this->cache->rememberVideoMeta(
        $vuid,
        fn () => Video::where('vuid', $vuid)->with('channel')->firstOrFail(),
    );
}

// 4. Lógica complexa inline (RUIM)
private function queryVideos(array $filters): LengthAwarePaginator
{
    $query = Video::filter($filters)->with('channel');
    
    $hasStatusFilter = isset($filters['status']);
    if (!$hasStatusFilter) {
        $query = $query->published();
    }

    return $query->paginate(PaginationSize::VIDEO_LIST);
}
```

---

## ✅ DEPOIS (Seu Padrão)

```php
// 1. Tipos específicos com DTO
public function listVideos(VideoListFilterDTO $filters): LengthAwarePaginator
{
    // 2. Lógica explícita com variáveis nomeadas
    $shouldCache = !$filters->hasFilters();

    if (!$shouldCache) {
        return $this->queryVideos($filters);
    }

    // 3. Closure EXTRAÍDO para variável ANTES de passar
    $cachedQuery = fn () => $this->queryVideos($filters);

    return $this->cache->rememberFeed($filters->page, $cachedQuery);
}

// 4. Closure EXTRAÍDO para variável ANTES de passar
public function getVideoByUuid(string $vuid): Video
{
    $queryFn = fn () => Video::byVuid($vuid)->with('channel')->firstOrFail();

    return $this->cache->rememberVideoMeta($vuid, $queryFn);
}

// 5. Dados estruturados ANTES de usar
private function queryVideos(VideoListFilterDTO $filters): LengthAwarePaginator
{
    // Monta os dados de forma explícita
    $query = Video::filter([
        'page' => $filters->page,
        'search' => $filters->search,
        'tags' => $filters->tags,
        'status' => $filters->status,
    ])->with('channel');

    // Condições com variáveis nomeadas (não inline)
    $shouldApplyPublished = $filters->status === null;

    if ($shouldApplyPublished) {
        $query = $query->published();
    }

    return $query->paginate(PaginationSize::VIDEO_LIST);
}
```

---

## 📋 Seu Padrão Identificado

### 1. **Tipos Específicos, Não Arrays Genéricos**
```php
// ❌ Evita
public function handle(array $data) {}

// ✅ Prefere
public function handle(VideoListFilterDTO $filters) {}
```

### 2. **Closures Extraídos, Nunca Inline**
```php
// ❌ Evita
$this->cache->rememberFeed($page, fn () => $this->query());

// ✅ Prefere
$queryFn = fn () => $this->query();
$this->cache->rememberFeed($page, $queryFn);
```

### 3. **Dados Estruturados Antes de Passar**
```php
// ❌ Evita
Video::filter($filters)->with('channel')->published()

// ✅ Prefere
$query = Video::filter([
    'page' => $filters->page,
    'search' => $filters->search,
    'status' => $filters->status,
])->with('channel');

$shouldApplyPublished = $filters->status === null;
if ($shouldApplyPublished) {
    $query = $query->published();
}
```

### 4. **Condições com Variáveis Nomeadas**
```php
// ❌ Evita
if (isset($filters['search']) || isset($filters['tags'])) {}

// ✅ Prefere
$shouldCache = !$filters->hasFilters();
if (!$shouldCache) {}
```

### 5. **Sem Parâmetros Complexos em Chamadas**
```php
// ❌ Evita - múltiplos parâmetros complexos
$this->cache->rememberVideoMeta(
    $vuid,
    fn () => Video::where('vuid', $vuid)->with('channel')->firstOrFail(),
);

// ✅ Prefere - parâmetros simples
$queryFn = fn () => Video::byVuid($vuid)->with('channel')->firstOrFail();
$this->cache->rememberVideoMeta($vuid, $queryFn);
```

---

## 🎯 Benefícios do Seu Padrão

✅ **Legibilidade** - Código linear, sem nenhado dentro de chamadas  
✅ **Testabilidade** - Cada passo é testável isoladamente  
✅ **Type Safety** - DTOs forçam tipos específicos  
✅ **Manutenibilidade** - Mudanças em um lugar, não espalhadas  
✅ **Debuggabilidade** - Fácil colocar breakpoints em cada etapa  
✅ **Clean Code** - Sem "truques" ou callbacks aninhados  

---

## 📌 Regras do Seu Padrão

1. **Sempre use DTOs** para parâmetros complexos
2. **Extraia closures** para variáveis com nome descritivo
3. **Monte dados** em variáveis antes de passar
4. **Use variáveis booleanas nomeadas** para condições complexas
5. **Nunca passe callbacks/closures inline** como parâmetros
6. **Cada linha faz uma coisa** - sem múltiplas operações por linha
