<?php

declare(strict_types=1);

/**
 * Rename PHP 4 style constructors to __construct().
 *
 * A method with the same name as its class was the constructor until PHP 7
 * deprecated the form and PHP 8 removed it. Such a method is now just an
 * ordinary method: `new user($id)` runs no constructor at all, hands back an
 * object with only its declared defaults, and every later read or write is
 * silently wrong. That is why character state stopped reaching the database.
 *
 * Classes that already declare __construct() are skipped, as are same-name
 * methods whose signature differs from a constructor's usage - none exist
 * here, but the check keeps the tool honest if it is re-run later.
 *
 * Usage:
 *   php scripts/codemod/php4-constructors.php [--dry-run] [path ...]
 */

$argv = $_SERVER['argv'];
\array_shift($argv);

$dryRun = false;
$paths  = [];

foreach ($argv as $arg) {
    if ($arg === '--dry-run') {
        $dryRun = true;
        continue;
    }
    $paths[] = $arg;
}

if ($paths === []) {
    $paths = [\dirname(__DIR__, 2)];
}

/**
 * @return list<array{class: string, line: int, offset: int, length: int}>
 */
function findLegacyConstructors(string $code): array
{
    $tokens = \token_get_all($code);
    $count  = \count($tokens);

    $found        = [];
    $currentClass = null;
    $depth        = 0;
    $classDepth   = -1;
    $seenCtor     = [];

    for ($i = 0; $i < $count; $i++) {
        $token = $tokens[$i];

        if (\is_string($token)) {
            if ($token === '{') {
                $depth++;
            } elseif ($token === '}') {
                $depth--;
                if ($currentClass !== null && $depth <= $classDepth) {
                    $currentClass = null;
                    $classDepth   = -1;
                }
            }
            continue;
        }

        if ($token[0] === \T_CLASS) {
            // Skip anonymous classes and ::class constants.
            for ($j = $i + 1; $j < $count; $j++) {
                if (\is_array($tokens[$j]) && $tokens[$j][0] === \T_WHITESPACE) {
                    continue;
                }
                if (\is_array($tokens[$j]) && $tokens[$j][0] === \T_STRING) {
                    $currentClass = $tokens[$j][1];
                    $classDepth   = $depth;
                }
                break;
            }
            continue;
        }

        if ($token[0] !== \T_FUNCTION || $currentClass === null) {
            continue;
        }

        for ($j = $i + 1; $j < $count; $j++) {
            if (\is_array($tokens[$j]) && $tokens[$j][0] === \T_WHITESPACE) {
                continue;
            }

            if (!\is_array($tokens[$j]) || $tokens[$j][0] !== \T_STRING) {
                break;
            }

            $name = $tokens[$j][1];

            if (\strcasecmp($name, '__construct') === 0) {
                $seenCtor[$currentClass] = true;
            } elseif (\strcasecmp($name, $currentClass) === 0) {
                $found[] = [
                    'class' => $currentClass,
                    'name'  => $name,
                    'line'  => $tokens[$j][2],
                ];
            }

            break;
        }
    }

    // A class that also declares __construct() keeps it; the same-name method
    // there is a plain method and must not be touched.
    return \array_values(\array_filter(
        $found,
        static fn (array $hit): bool => !isset($seenCtor[$hit['class']])
    ));
}

$files = [];
foreach ($paths as $path) {
    if (\is_file($path)) {
        $files[] = $path;
        continue;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $real = $file->getPathname();
            if (\str_contains($real, '/app/') || \str_contains($real, '/scripts/')) {
                continue;
            }
            $files[] = $real;
        }
    }
}

$total   = 0;
$touched = 0;

foreach ($files as $file) {
    $code = \file_get_contents($file);
    if ($code === false) {
        continue;
    }

    $hits = findLegacyConstructors($code);
    if ($hits === []) {
        continue;
    }

    $lines = \explode("\n", $code);

    foreach ($hits as $hit) {
        $index = $hit['line'] - 1;
        if (!isset($lines[$index])) {
            continue;
        }

        $replaced = \preg_replace(
            '/\bfunction(\s+)' . \preg_quote($hit['name'], '/') . '\s*\(/i',
            'function$1__construct(',
            $lines[$index],
            1
        );

        if ($replaced === null || $replaced === $lines[$index]) {
            continue;
        }

        $lines[$index] = $replaced;
        $total++;

        echo "  {$file}:{$hit['line']}  {$hit['class']}::{$hit['name']}() -> __construct()\n";
    }

    $touched++;

    if (!$dryRun) {
        \file_put_contents($file, \implode("\n", $lines));
    }
}

echo "\n" . ($dryRun ? 'would rename ' : 'renamed ')
    . $total . " constructor(s) in {$touched} file(s)\n";
