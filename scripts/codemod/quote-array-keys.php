<?php

declare(strict_types=1);

/**
 * Quote bareword array keys.
 *
 * PHP 5 resolved `$row[name]` to the string "name" after emitting a notice.
 * PHP 8 raises `Error: Undefined constant "name"`, which is fatal, so every
 * such key has to be quoted before the game can run.
 *
 * The rewrite runs over token_get_all() rather than a regular expression so
 * that identical-looking text inside strings, comments, HTML and regex
 * literals is left alone.
 *
 * Usage:
 *   php scripts/codemod/quote-array-keys.php [--dry-run] [path ...]
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

/** Tokens that can legally precede the `[` of an array *access*. */
const SUBSCRIPT_PREDECESSORS = [
    \T_VARIABLE,
    \T_STRING,                    // $obj->prop[...] / Class::CONST[...]
    \T_CONSTANT_ENCAPSED_STRING,  // 'abc'[0]
];

function isSubscriptOpen(array $tokens, int $index): bool
{
    for ($i = $index - 1; $i >= 0; $i--) {
        $token = $tokens[$i];

        if (\is_array($token) && \in_array($token[0], [\T_WHITESPACE, \T_COMMENT, \T_DOC_COMMENT], true)) {
            continue;
        }

        if (\is_string($token)) {
            // `]` and `)` close a previous subscript or call, so a `[` right
            // after them is chained access: $a[0][b], foo()[b].
            return $token === ']' || $token === ')';
        }

        return \in_array($token[0], SUBSCRIPT_PREDECESSORS, true);
    }

    return false;
}

function nextMeaningful(array $tokens, int $index): int
{
    $count = \count($tokens);
    for ($i = $index + 1; $i < $count; $i++) {
        $token = $tokens[$i];
        if (\is_array($token) && \in_array($token[0], [\T_WHITESPACE, \T_COMMENT, \T_DOC_COMMENT], true)) {
            continue;
        }

        return $i;
    }

    return -1;
}

/**
 * A bareword that is a real constant must not be quoted. Anything screaming
 * case is treated as a constant too - the game defines none, but bundled
 * libraries such as Securimage and the Facebook SDK do.
 */
function looksLikeConstant(string $name): bool
{
    return \defined($name) || \preg_match('/^[A-Z][A-Z0-9_]*$/', $name) === 1;
}

function rewrite(string $code, int &$changes): string
{
    $tokens = @\token_get_all($code);
    $out    = '';
    $count  = \count($tokens);

    // Inside a double-quoted string, heredoc or backtick, "simple" variable
    // interpolation ("$row[name]") requires the key to stay unquoted -
    // writing "$row['name']" there is a parse error. Only the braced form
    // ("{$row[name]}") is ordinary expression syntax and does need quoting.
    $inString   = false;
    $curlyDepth = 0;

    for ($i = 0; $i < $count; $i++) {
        $token = $tokens[$i];

        if (\is_array($token)) {
            if ($token[0] === \T_START_HEREDOC) {
                $inString = true;
            } elseif ($token[0] === \T_END_HEREDOC) {
                $inString   = false;
                $curlyDepth = 0;
            } elseif ($token[0] === \T_CURLY_OPEN || $token[0] === \T_DOLLAR_OPEN_CURLY_BRACES) {
                $curlyDepth++;
            }
        } elseif ($token === '"' || $token === '`') {
            $inString   = !$inString;
            $curlyDepth = 0;
        } elseif ($curlyDepth > 0 && $token === '{') {
            $curlyDepth++;
        } elseif ($curlyDepth > 0 && $token === '}') {
            $curlyDepth--;
        }

        $inSimpleInterpolation = $inString && $curlyDepth === 0;

        if ($token !== '[' || $inSimpleInterpolation || !isSubscriptOpen($tokens, $i)) {
            $out .= \is_array($token) ? $token[1] : $token;
            continue;
        }

        $keyIndex = nextMeaningful($tokens, $i);
        if ($keyIndex === -1 || !\is_array($tokens[$keyIndex]) || $tokens[$keyIndex][0] !== \T_STRING) {
            $out .= '[';
            continue;
        }

        $closeIndex = nextMeaningful($tokens, $keyIndex);
        if ($closeIndex === -1 || $tokens[$closeIndex] !== ']') {
            // Not a lone bareword: `$a[foo()]`, `$a[FOO . 'x']`, etc.
            $out .= '[';
            continue;
        }

        $name = $tokens[$keyIndex][1];
        if (looksLikeConstant($name)) {
            $out .= '[';
            continue;
        }

        $out .= "['" . $name . "']";
        $changes++;
        $i = $closeIndex;
    }

    return $out;
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
            // The new code is already correct, and vendored libraries are
            // upgraded by replacing them rather than by patching.
            if (\str_contains($real, '/app/') || \str_contains($real, '/scripts/')) {
                continue;
            }
            $files[] = $real;
        }
    }
}

$totalChanges = 0;
$touchedFiles = 0;

foreach ($files as $file) {
    $code = \file_get_contents($file);
    if ($code === false) {
        \fwrite(\STDERR, "unreadable: {$file}\n");
        continue;
    }

    $changes = 0;
    $new     = rewrite($code, $changes);

    if ($changes === 0 || $new === $code) {
        continue;
    }

    $totalChanges += $changes;
    $touchedFiles++;

    echo \str_pad((string) $changes, 5, ' ', \STR_PAD_LEFT) . '  ' . $file . "\n";

    if (!$dryRun) {
        \file_put_contents($file, $new);
    }
}

echo "\n" . ($dryRun ? 'would quote ' : 'quoted ')
    . $totalChanges . " key(s) in {$touchedFiles} file(s)\n";
