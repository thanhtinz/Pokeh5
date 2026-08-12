<?php

declare(strict_types=1);

/**
 * Copy this file to `config.php` and fill it in. `config.php` is git-ignored —
 * the original release shipped the database root password in tracked source,
 * which is how it ended up public.
 */
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('DB_PORT') ?: 3306),
        'name' => getenv('DB_NAME') ?: 'pokemon',
        // Never the MySQL root account: this user only needs SELECT on
        // t_account plus INSERT on the mail and gift tables.
        'user' => getenv('DB_USER') ?: 'pokemon_portal',
        'pass' => getenv('DB_PASS') ?: '',
    ],

    'site' => [
        'name' => 'Pokemon H5',
        // Where the "Play" button points. Set this to your game client host.
        'play_url' => getenv('PLAY_URL') ?: 'http://localhost:8080',
        // Shown on the top-up page. Left blank so nobody accidentally
        // publishes the previous operator's bank details.
        'support_zalo' => getenv('SUPPORT_ZALO') ?: '',
        'support_bank' => getenv('SUPPORT_BANK') ?: '',
    ],

    'security' => [
        // Failed logins allowed per account before a cooldown kicks in.
        'login_attempts' => 8,
        'login_window_seconds' => 900,
        // Set to true once the site is behind HTTPS.
        'secure_cookies' => filter_var(getenv('SECURE_COOKIES') ?: 'false', FILTER_VALIDATE_BOOL),
    ],
];
