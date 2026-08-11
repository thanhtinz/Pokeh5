<?php

declare(strict_types=1);

/**
 * Router for PHP's built-in server, for local development only.
 *
 *   php -S 127.0.0.1:8000 -t . scripts/dev-router.php
 *
 * `php -S` does not read .htaccess, so the rewrites the game depends on never
 * happen and /game.json - the URL the loader points its iframe at - comes back
 * as a 404 with a blank page. This reproduces the rewrite rules from .htaccess
 * so the game boots the same way it does behind Apache.
 *
 * Not for production: Apache and nginx serve the real thing, and this file
 * intentionally has no access control beyond what .htaccess declares.
 */

$path = \parse_url($_SERVER['REQUEST_URI'] ?? '/', \PHP_URL_PATH) ?: '/';
$path = \rawurldecode($path);

// Mirrors the RedirectMatch rules in .htaccess.
if (\preg_match('#^/(storage|app|scripts|tests|db)(/|$)#', $path) === 1
    || $path === '/config.local.php'
) {
    \http_response_code(404);

    return true;
}

// RewriteRule ^maps/code/(benhvien|shop|nha)-(.*).xml$ maps/code/$1.xml
if (\preg_match('#^/maps/code/(benhvien|shop|nha)-.*\.xml$#', $path, $m) === 1) {
    \header('Content-Type: text/xml; charset=utf-8');
    \readfile(__DIR__ . '/../maps/code/' . $m[1] . '.xml');

    return true;
}

// RewriteRule ^screen/images/game/close.png$ style/images/game/close.png
if ($path === '/screen/images/game/close.png') {
    $path = '/style/images/game/close.png';
}

/**
 * Run a script the way a web server would.
 *
 * The game includes its dependencies with paths relative to the including
 * file ("../templates/config.php"). Under Apache the working directory is the
 * script's own directory, and PHP resolves those against it. Requiring the
 * file from this router leaves the working directory at the document root
 * instead, and the includes miss - which shows up further in as
 * "Call to undefined function t()" once a handler runs without its config.
 */
function run(string $script): void
{
    $previous = \getcwd();
    \chdir(\dirname($script));

    try {
        require $script;
    } finally {
        if ($previous !== false) {
            \chdir($previous);
        }
    }
}

// RewriteRule ^game.json$ data.php?ducnghia
if ($path === '/game.json') {
    $_GET['ducnghia'] = '';
    $_SERVER['QUERY_STRING'] = 'ducnghia';

    run(__DIR__ . '/../data.php');

    return true;
}

// RewriteRule ^(.*).json$ data/index.php
if (\str_ends_with($path, '.json')) {
    $_SERVER['SCRIPT_NAME'] = '/data/index.php';

    run(__DIR__ . '/../data/index.php');

    return true;
}

$file = __DIR__ . '/../' . \ltrim($path, '/');

if ($path !== '/' && \is_file($file)) {
    // Let the built-in server handle static files and .php itself.
    return false;
}

if (\is_dir($file) && \is_file(\rtrim($file, '/') . '/index.php')) {
    run(\rtrim($file, '/') . '/index.php');

    return true;
}

run(__DIR__ . '/../index.php');

return true;
