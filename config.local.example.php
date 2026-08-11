<?php

/**
 * Copy to config.local.php and edit. That file is gitignored.
 *
 * Anything omitted falls back to the environment (DB_HOST, DB_NAME, DB_USER,
 * DB_PASS, APP_DEBUG) and then to the defaults in app/Config.php.
 */

return [
    'db.host' => '127.0.0.1',
    'db.port' => 3306,
    'db.name' => 'pokemon',
    'db.user' => 'pokeh5',
    'db.pass' => '',

    // Keep this false in production. With it on, PHP warnings are printed
    // into the response body, which corrupts the JSON the client parses.
    'debug' => false,
];
