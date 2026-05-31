# Guia de Refactor - Padrão Clean Code para Services

## Aplicar em TODOS os Services

### 1️⃣ Identificar Closures Inline

**ANTES:**
```php
return $this->cache->remember($key, fn () => Model::query()->get());
```

**DEPOIS:**
```php
$query = fn () => Model::query()->get();
return $this->cache->remember($key, $query);
```

---

### 2️⃣ Identificar Arrays Inline em Chamadas

**ANTES:**
```php
$result = Model::filter([
    'page' => $filters->page,
    'search' => $filters->search,
    'tags' => $filters->tags,
])->get();
```

**DEPOIS:**
```php
$filterData = [
    'page' => $filters->page,
    'search' => $filters->search,
    'tags' => $filters->tags,
];

$result = Model::filter($filterData)->get();
```

---

### 3️⃣ Converter Parâmetros Array para DTOs

**ANTES:**
```php
public function list(array $filters): Collection
{
    $hasFilters = isset($filters['search']) || isset($filters['tags']);
    if ($hasFilters) {...}
}
```

**DEPOIS:**
```php
public function list(YourFilterDTO $filters): Collection
{
    $hasFilters = $filters->hasSearchOrTags();
    if ($hasFilters) {...}
}
```

---

### 4️⃣ Usar Variáveis Booleanas Nomeadas

**ANTES:**
```php
if (isset($data['key']) && $data['key'] !== null && $data['status'] === 'active') {}
```

**DEPOIS:**
```php
$isValid = isset($data['key']) && $data['key'] !== null;
$isActive = $data['status'] === 'active';

if ($isValid && $isActive) {}
```

---

### 5️⃣ Extrair Transformações para Variáveis

**ANTES:**
```php
Model::create([
    'user_id' => $user->id,
    'video_id' => $video->id,
    'data' => json_encode($transformData($input)),
])->with(['user', 'video']);
```

**DEPOIS:**
```php
$userId = $user->id;
$videoId = $video->id;
$encodedData = json_encode($transformData($input));

$payload = [
    'user_id' => $userId,
    'video_id' => $videoId,
    'data' => $encodedData,
];

$model = Model::create($payload);
$result = $model->load(['user', 'video']);
```

---

## Services Prioritários (em ordem)

1. **VideoReactionService** - Muitos closures e transações
2. **PlaylistService** - Arrays complexos
3. **RecommendationService** - Lógica complexa
4. **ChannelService** - Queries complexas
5. **UserService** - Múltiplos parâmetros
6. **CommentService** - Transações com múltiplos dados
7. **VideoProgressService** - Lógica simples (rápido)
8. **VideoPublishingService** - Queries com filtros
9. **ViewCounterService** - Updates diretos
10. **AnalyticsService** - Inserts em massa

---

## Checklist de Refactor por Service

Para cada service:
- [ ] Identificar todos os closures inline
- [ ] Extrair closures para variáveis
- [ ] Identificar todos os arrays inline
- [ ] Extrair arrays para variáveis
- [ ] Converter parâmetros array para DTOs
- [ ] Usar variáveis booleanas nomeadas
- [ ] Testar se funciona igual
- [ ] Commit com padrão: "refactor: apply clean code pattern"

---

## Template de Commit

```
refactor: apply clean code pattern to [ServiceName]

Extract closures to variables before function calls.
Separate data structures before using in function arguments.
Use named boolean variables for conditions.
```
