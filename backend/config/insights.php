<?php

declare(strict_types=1);

use NunoMaduro\PhpInsights\Domain\Insights\ClassMethodAverageCyclomaticComplexityIsHigh;
use NunoMaduro\PhpInsights\Domain\Insights\CyclomaticComplexityIsHigh;
use NunoMaduro\PhpInsights\Domain\Insights\ForbiddenDefineFunctions;
use NunoMaduro\PhpInsights\Domain\Insights\ForbiddenNormalClasses;
use NunoMaduro\PhpInsights\Domain\Insights\ForbiddenPrivateMethods;
use NunoMaduro\PhpInsights\Domain\Insights\ForbiddenTraits;
use NunoMaduro\PhpInsights\Domain\Insights\MethodCyclomaticComplexityIsHigh;
use NunoMaduro\PhpInsights\Domain\Metrics\Architecture\Classes;
use ObjectCalisthenics\Sniffs\Classes\ForbiddenPublicPropertySniff;
use PHP_CodeSniffer\Standards\Generic\Sniffs\Files\LineLengthSniff;
use PHP_CodeSniffer\Standards\Generic\Sniffs\Formatting\SpaceAfterNotSniff;
use PHP_CodeSniffer\Standards\PEAR\Sniffs\WhiteSpace\ScopeClosingBraceSniff;
use PHP_CodeSniffer\Standards\PSR2\Sniffs\Methods\FunctionClosingBraceSniff;
use PhpCsFixer\Fixer\Basic\BracesFixer;
use PhpCsFixer\Fixer\ClassNotation\OrderedClassElementsFixer;
use SlevomatCodingStandard\Sniffs\Classes\ForbiddenPublicPropertySniff as SlevomatForbiddenPublicPropertySniff;
use SlevomatCodingStandard\Sniffs\Classes\SuperfluousExceptionNamingSniff;
use SlevomatCodingStandard\Sniffs\Commenting\UselessFunctionDocCommentSniff;
use SlevomatCodingStandard\Sniffs\ControlStructures\EarlyExitSniff;
use SlevomatCodingStandard\Sniffs\ControlStructures\UselessIfConditionWithReturnSniff;
use SlevomatCodingStandard\Sniffs\Functions\FunctionLengthSniff;
use SlevomatCodingStandard\Sniffs\Functions\UnusedParameterSniff;
use SlevomatCodingStandard\Sniffs\Namespaces\AlphabeticallySortedUsesSniff;
use SlevomatCodingStandard\Sniffs\TypeHints\DeclareStrictTypesSniff;
use SlevomatCodingStandard\Sniffs\TypeHints\DisallowMixedTypeHintSniff;
use SlevomatCodingStandard\Sniffs\TypeHints\ParameterTypeHintSniff;
use SlevomatCodingStandard\Sniffs\TypeHints\PropertyTypeHintSniff;
use SlevomatCodingStandard\Sniffs\TypeHints\ReturnTypeHintSniff;

return [

    'preset' => 'laravel',

    'ide' => null,

    'exclude' => [
        'bootstrap',
        'config',
        'database/migrations',
        'storage',
        // AI prompt files contain inherently long English strings (cannot be split).
        'app/AI/Prompts',
    ],

    'add' => [
        Classes::class => [
            // Enforce early-return style: forbid `else`/`elseif` after a return/throw.
            EarlyExitSniff::class,
            // Flag `if (cond) return true; return false;` that should be `return cond;`.
            UselessIfConditionWithReturnSniff::class,
        ],
    ],

    'remove' => [
        AlphabeticallySortedUsesSniff::class,
        DeclareStrictTypesSniff::class,
        DisallowMixedTypeHintSniff::class,
        ForbiddenDefineFunctions::class,
        ForbiddenNormalClasses::class,
        ForbiddenTraits::class,
        ParameterTypeHintSniff::class,
        PropertyTypeHintSniff::class,
        ReturnTypeHintSniff::class,
        UselessFunctionDocCommentSniff::class,

        // Laravel model properties ($fillable, $casts, $timestamps, $table) must be public.
        ForbiddenPublicPropertySniff::class,

        // Policies, notifications and service providers have fixed interface signatures
        // with parameters not always consumed by the implementation.
        UnusedParameterSniff::class,

        // pint.json sets not_operator_with_successor_space: false, so !$var is canonical here.
        SpaceAfterNotSniff::class,

        // Laravel models/jobs/listeners REQUIRE public $timestamps, $table, $queue, $tries, etc.
        SlevomatForbiddenPublicPropertySniff::class,

        // Standard PHP/Laravel convention to suffix exceptions with "Exception".
        SuperfluousExceptionNamingSniff::class,

        // Conflicts with Pint; `construct() {}` is valid PHP.
        ScopeClosingBraceSniff::class,
        FunctionClosingBraceSniff::class,

        // Conflicts with Pint's ordering.
        OrderedClassElementsFixer::class,

        // Conflicts with Pint; single-line `{}` on constructors is valid PHP.
        BracesFixer::class,
    ],

    'config' => [
        ForbiddenPrivateMethods::class => [
            'title' => 'The usage of private methods is not idiomatic in Laravel.',
        ],

        // 80 chars is too strict for modern PHP; raise to 120.
        LineLengthSniff::class => [
            'lineLimit' => 120,
            'absoluteLineLimit' => 0,
        ],


        // 20 lines is too strict for service methods with branching logic.
        FunctionLengthSniff::class => [
            'maxLinesLength' => 40,
        ],

        // Raise cyclomatic complexity thresholds to practical values.
        CyclomaticComplexityIsHigh::class => [
            'maxComplexity' => 40,
        ],
        MethodCyclomaticComplexityIsHigh::class => [
            'maxMethodComplexity' => 12,
        ],
        ClassMethodAverageCyclomaticComplexityIsHigh::class => [
            'maxClassMethodAverageComplexity' => 8.0,
        ],
    ],

    'requirements' => [],

    'threads' => null,

    'timeout' => 60,
];
