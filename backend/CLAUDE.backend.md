# Backend — PHPStan Documentation Standards

## 📋 Mandatory Rules

All methods, properties, and classes **must have PHPStan documentation**:

### ✅ Complete Documentation (mandatory)

```php
<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * VideoController — Manages video CRUD operations.
 * 
 * Responsibilities:
 * - List videos with pagination and filters
 * - Create, update, delete videos
 * - Record views and interactions (like, dislike, save)
 * - Return video summaries
 */
class VideoController extends Controller
{
    /**
     * List all videos with pagination.
     * 
     * @param Request $request Query parameters: page, perPage, search, tags[], status
     * @return array{data: Video[], meta: array{total: int, page: int, perPage: int}}
     * @throws \InvalidArgumentException If page < 1 or perPage > 100
     */
    public function index(Request $request): array
    {
        // ...
    }

    /**
     * Retrieve a specific video by UUID.
     * 
     * @param string $vuid Video UUID (v4)
     * @return Video
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function show(string $vuid): Video
    {
        // ...
    }

    /**
     * Create a new video.
     * 
     * @param Request $request Payload: title, description, tags[], status, scheduledAt?
     * @return Video Video created with $vuid
     * @throws \Illuminate\Validation\ValidationException If validation fails
     */
    public function store(Request $request): Video
    {
        // ...
    }

    /**
     * Update an existing video.
     * 
     * @param string $vuid Video UUID
     * @param Request $request Partial payload: title?, description?, status?, tags[]?, scheduledAt?
     * @return Video Updated video
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Validation\ValidationException
     */
    public function update(string $vuid, Request $request): Video
    {
        // ...
    }

    /**
     * Delete a video permanently.
     * 
     * @param string $vuid Video UUID
     * @return Response HTTP 204 No Content
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function destroy(string $vuid): Response
    {
        // ...
    }
}
```

## 📝 Documentation Format

### Classes
```php
/**
 * [ClassName] — [One-line description]
 * 
 * [Detailed description of responsibilities (multiline, optional)]
 */
class ClassName
{
}
```

### Methods
```php
/**
 * [Clear description of what it does]
 * 
 * [Additional details (optional)]
 * 
 * @param ParameterType $parameterName Brief description
 * @param bool $optional (optional) Description
 * @return ReturnType Description of return value
 * @throws \ExceptionClass When thrown and why
 */
public function methodName(ParameterType $parameterName): ReturnType
{
}
```

### Properties
```php
/**
 * Brief description.
 */
private string $property;

/**
 * @var array<string, int> Tag frequency map
 */
private array $tagFrequency = [];
```

## 🔍 Mandatory Type Hints

All parameters and returns **must have type hints**:

✅ **Correct:**
```php
public function delete(string $vuid): Response { }
public function listVideos(int $page = 1): array { }
public function getByTag(string $tag): ?Video { }
```

❌ **Incorrect:**
```php
public function delete($vuid) { }                    // No type hint
public function listVideos(int $page = 1) { }        // No return type
public function getByTag($tag) { }                   // No types
```

## 🏷️ Complex Types

For arrays and generics, use PHPDoc notation:

```php
/**
 * @param list<string> $tags List of tags
 * @param array<string, int> $frequencies Tag → count map
 * @return array{data: Video[], meta: array{total: int, page: int}}
 */
public function complex(array $tags, array $frequencies): array
{
    // ...
}
```

## 🛠️ PHPStan Verification

```bash
# Analyze all PHP code
composer lint

# Auto-format with Pint
composer lint:fix

# PHPStan with level 8 (strict)
vendor/bin/phpstan analyse --level=8 app/Http/Controllers/
```

## 📚 Patterns by Type

### Models
```php
/**
 * Video — Video model in database.
 * 
 * @property string $vuid Unique v4 UUID
 * @property string $title Video title
 * @property int $views View count
 * @property \Carbon\Carbon $published_at Publication date
 */
class Video extends Model
{
    /**
     * Get the user (channel) that published this video.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }
}
```

### Requests
```php
/**
 * VideoUploadRequest — Validates new video upload.
 */
class VideoUploadRequest extends FormRequest
{
    /**
     * Get the validation rules.
     * 
     * @return array<string, string|array<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
```

### Services
```php
/**
 * VideoService — Business logic for videos.
 * 
 * Responsible for:
 * - Create/update/delete videos
 * - Process uploads asynchronously
 * - Generate AI summaries
 */
class VideoService
{
    /**
     * Process a new video upload asynchronously.
     * 
     * @param \Illuminate\Http\UploadedFile $file Video file
     * @param array{title: string, description?: string, tags?: list<string>} $metadata
     * @return string Job ID for progress tracking
     */
    public function processUpload(UploadedFile $file, array $metadata): string
    {
        // ...
    }
}
```

## ⚠️ Common Mistakes

### ❌ No documentation
```php
public function index($request) { }  // PHPStan will complain
```

### ❌ Incomplete type hints
```php
public function show(string $id): ?Video { }  // Missing exception docs
```

### ❌ Vague documentation
```php
/**
 * Process the video.
 */
public function process(Video $video): void { }  // What? When fails?
```

## ✅ Checklist Before Committing

- [ ] All methods have `@param` and `@return`
- [ ] All `@param` describe expected usage
- [ ] All `@return` describe the value returned
- [ ] Exceptions documented with `@throws`
- [ ] Type hints on parameters and returns
- [ ] `composer lint` passes without errors
- [ ] Public classes and methods have descriptions
- [ ] Complex arrays use `array{...}` or `list<...>` notation

## 🔄 Post-Change Workflow

**After EVERY change to the backend**, follow this workflow to ensure code quality:

### 1️⃣ Verify Code Style & Types
```bash
# Check for PHPStan level 8 errors
composer lint

# Auto-fix formatting issues (Pint)
composer lint:fix

# Verify lint passes (should see [OK] No errors)
composer lint
```

### 2️⃣ Write Unit Tests

**OBRIGATÓRIO:** Toda classe/arquivo novo **DEVE** ter testes unitários:

#### Novos Tipos (Enums)
Teste: `tests/Unit/Enums/NomeTest.php`
```php
class VideoStatusTest extends TestCase
{
    public function allStatusesHaveCorrectValues(): void { ... }
    public function valuesReturnsAllStatusValues(): void { ... }
    public function isPublicReturnsTrueOnlyForPublished(): void { ... }
}
```
✅ Teste: casos de enum, métodos helper, validações

#### Novos Models
Teste: `tests/Unit/Models/NomeTest.php`
```php
class VideoTest extends TestCase
{
    public function videoIsCreatedWithAutoGeneratedVuid(): void { ... }
    public function belongsToChannel(): void { ... }
    public function scopePublishedFiltersOnlyPublished(): void { ... }
}
```
✅ Teste: scopes, relacionamentos, casts, validações

#### Novos Services
Teste: `tests/Unit/Services/NomeTest.php`
```php
class VideoServiceTest extends TestCase
{
    public function createVideoStoresDataCorrectly(): void { ... }
    public function listVideosReturnsPaginatedResults(): void { ... }
    public function toggleLikeCreatesReaction(): void { ... }
}
```
✅ Teste: todos os métodos públicos, transações, lógica de negócio

#### Novos Controllers
Teste: `tests/Feature/Http/Controllers/NomeTest.php`
```php
class VideoControllerTest extends TestCase
{
    public function indexReturnsPaginatedVideos(): void { ... }
    public function storeCreatesNewVideoWhenAuthorized(): void { ... }
    public function updateModifiesVideo(): void { ... }
}
```
✅ Teste: HTTP responses, autenticação, autorização via policies, status codes

#### Novos FormRequests
Teste: `tests/Unit/Requests/NomeTest.php` (validações)
```php
public function validationPassesWithCorrectData(): void { ... }
public function validationFailsWithMissingRequired(): void { ... }
```
✅ Teste: regras de validação, mensagens customizadas

Run tests:
```bash
# Run all tests
composer test

# Run specific test file
composer test tests/Feature/Http/Controllers/VideoControllerTest.php

# Run with coverage
composer test -- --coverage

# Run only unit tests or only feature tests
composer test tests/Unit
composer test tests/Feature
```

### 3️⃣ Add PHPStan Documentation

Every new method/property **must** have complete PHPDoc:

```php
/**
 * Create a new video and queue processing job.
 *
 * Validates input, creates record, and dispatches async job
 * for transcoding and thumbnail generation.
 *
 * @param Request $request Form data: title, description, tags[], status, videoFile, thumbnailFile?
 * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection Created video with $vuid
 * @throws \Illuminate\Validation\ValidationException If validation fails
 * @throws \RuntimeException If file storage fails
 *
 * @see ProcessVideoJob For async processing details
 */
public function store(Request $request): AnonymousResourceCollection
{
    // ...
}
```

### 4️⃣ Complete Checklist

Before committing, verify:

```bash
# ✅ All three steps completed
composer lint           # PHPStan + Pint
composer test           # Unit tests pass
composer lint:fix       # Code formatted
```

**Example complete workflow:**
```bash
# 1. Make changes to VideoController
vim app/Http/Controllers/VideoController.php

# 2. Write tests
vim tests/Feature/Http/Controllers/VideoControllerTest.php

# 3. Run quality checks
composer lint
composer lint:fix
composer test

# 4. If all pass: commit
git add .
git commit -m "feat: add video filtering by tags"
```

## 🛑 What Fails CI/CD

These will **reject** your PR:

- ❌ `composer lint` returns errors
- ❌ `composer test` has failing tests
- ❌ **New file/class without corresponding test file** ← obrigatório!
- ❌ New code missing `@param`, `@return`, `@throws`
- ❌ Type hints missing from method signatures
- ❌ No unit tests for new features
- ❌ Model changes without relationship documentation
- ❌ Enum added without values() method test
- ❌ Service added without testing all public methods
- ❌ Controller added without Feature tests
- ❌ FormRequest added without validation tests

## 🔗 References

- [PHPStan Docs](https://phpstan.org/writing-php-code/phpdoc-types)
- [PHPDoc](https://www.phpdoc.org/)
- [Pest Testing](https://pestphp.com/) — Our test framework (describes() + test())
- Laravel: Eloquent Models, Requests, Controllers follow same rules
