<?php

declare(strict_types=1);

/**
 * Config used when the portal runs from deploy/docker-compose.yml, where the
 * source is mounted read-only and every setting arrives as an environment
 * variable. `bootstrap.php` falls back to this file when `config.php` is
 * absent and DB_HOST is set.
 *
 * It fails loudly rather than defaulting: a container that silently comes up
 * on an empty database password is worse than one that refuses to start.
 */

$required = static function (string $name): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        http_response_code(500);
        error_log("portal: missing required environment variable $name");
        exit("Thiếu biến môi trường $name.");
    }
    return $value;
};

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'db',
        'port' => (int) (getenv('DB_PORT') ?: 3306),
        'name' => getenv('DB_NAME') ?: 'pokemon',
        'user' => getenv('DB_USER') ?: 'pokemon_portal',
        'pass' => $required('DB_PASS'),
    ],

    'site' => [
        'name' => getenv('SITE_NAME') ?: 'Pokemon H5',
        'play_url' => getenv('PLAY_URL') ?: '/game/',
        'support_zalo' => getenv('SUPPORT_ZALO') ?: '',
        'support_bank' => getenv('SUPPORT_BANK') ?: '',
    ],

    'security' => [
        'login_attempts' => (int) (getenv('LOGIN_ATTEMPTS') ?: 8),
        'login_window_seconds' => (int) (getenv('LOGIN_WINDOW') ?: 900),
        'secure_cookies' => filter_var(getenv('SECURE_COOKIES') ?: 'false', FILTER_VALIDATE_BOOL),
    ],
];
