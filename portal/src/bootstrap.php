<?php

declare(strict_types=1);

namespace Portal;

/**
 * Single entry point for every page: loads config, wires the autoloader, opens
 * the database, starts a hardened session and sets response headers.
 */

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Session.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/GiftCode.php';
require_once __DIR__ . '/GameMail.php';

// Errors go to the log, never to the page. The original set
// `error_reporting(0)`, which hid real faults from the operator too.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

date_default_timezone_set('Asia/Ho_Chi_Minh');

// A local install writes config.php; the container has the source mounted
// read-only and passes settings as environment variables instead.
$configFile = __DIR__ . '/../config/config.php';
if (!is_file($configFile) && getenv('DB_HOST') !== false) {
    $configFile = __DIR__ . '/../config/config.docker.php';
}
if (!is_file($configFile)) {
    http_response_code(500);
    exit('Thiếu portal/config/config.php — sao chép từ config.example.php.');
}

/** @var array $config */
$config = require $configFile;

Session::start((bool) $config['security']['secure_cookies']);
Database::connect($config['db']);

$auth = new Auth(
    (int) $config['security']['login_attempts'],
    (int) $config['security']['login_window_seconds'],
);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');

/** HTML-escape helper; every echoed value in the templates goes through it. */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Replies with JSON and stops. */
function json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
