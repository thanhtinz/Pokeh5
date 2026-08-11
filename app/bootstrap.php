<?php

declare(strict_types=1);

/**
 * Entry point for every request.
 *
 * templates/config.php includes this before anything else, so the autoloader,
 * the session and the ext/mysql compatibility layer are in place by the time
 * any legacy file runs.
 */

if (\defined('POKEH5_BOOTSTRAPPED')) {
    return;
}

\define('POKEH5_BOOTSTRAPPED', true);
\define('POKEH5_ROOT', \dirname(__DIR__));

\spl_autoload_register(static function (string $class): void {
    if (!\str_starts_with($class, 'Pokeh5\\')) {
        return;
    }

    $relative = \str_replace('\\', '/', \substr($class, \strlen('Pokeh5\\')));
    $file     = __DIR__ . '/' . $relative . '.php';

    if (\is_file($file)) {
        require_once $file;
    }
});

require_once __DIR__ . '/Legacy/mysql.php';

\date_default_timezone_set((string) \Pokeh5\Config::get('timezone', 'Asia/Ho_Chi_Minh'));

if (\Pokeh5\Config::get('debug') === true) {
    \error_reporting(\E_ALL);
    \ini_set('display_errors', '1');
} else {
    // Notices and deprecations are noisy in ported 2019 code and would corrupt
    // the JSON responses the client parses; they still reach the error log.
    \error_reporting(\E_ALL & ~\E_NOTICE & ~\E_WARNING & ~\E_DEPRECATED);
    \ini_set('display_errors', '0');
    \ini_set('log_errors', '1');
}

if (\session_status() === \PHP_SESSION_NONE) {
    \session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off'),
    ]);
    \session_start();
}

$storage = (string) \Pokeh5\Config::get('storage.path');
if (!\is_dir($storage)) {
    @\mkdir($storage, 0775, true);
}
