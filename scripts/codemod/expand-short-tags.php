<?php

declare(strict_types=1);

/**
 * Expand short open tags `<?` into `<?php`.
 *
 * short_open_tag defaults to Off since PHP 5.4 and is discouraged everywhere
 * since; with it off, a `<?` block is not parsed as code at all but emitted as
 * HTML. That is what made nine files in this game report "Unclosed '{'" - the
 * closing brace of a block sat inside a `<? ... ?>` region PHP never read.
 *
 * `<?=` is the short echo tag, which is always enabled and stays as is.
 * `<?xml` is data, not code.
 *
 * Detection uses token_get_all(), so only sequences PHP actually treats as
 * inline HTML are rewritten; a literal "<?" inside a PHP string is untouched.
 *
 * Usage:
 *   php scripts/codemod/expand-short-tags.php [--dry-run] [path ...]
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

function rewrite(string $code, int &$changes): string
{
    $tokens = @\token_get_all($code);
    $out    = '';

    foreach ($tokens as $token) {
        if (!\is_array($token) || $token[0] !== \T_INLINE_HTML) {
            $out .= \is_array($token) ? $token[1] : $token;
            continue;
        }

        $html = \preg_replace_callback(
            '/<\?(?!php\b|=|xml\b)/i',
            static function (array $m) use (&$changes): string {
                $changes++;

                return '<?php ';
            },
            $token[1]
        );

        $out .= $html;
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

echo "\n" . ($dryRun ? 'would expand ' : 'expanded ')
    . $totalChanges . " short tag(s) in {$touchedFiles} file(s)\n";
