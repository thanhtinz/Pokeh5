<?php

declare(strict_types=1);

namespace Pokeh5;

/**
 * Runtime configuration.
 *
 * Values are read from the environment first so the game can be deployed
 * without editing tracked files. A gitignored config.local.php at the project
 * root may return an array that overrides individual keys for local work.
 */
final class Config
{
    /** @var array<string, mixed>|null */
    private static ?array $values = null;

    /** @return array<string, mixed> */
    public static function all(): array
    {
        if (self::$values !== null) {
            return self::$values;
        }

        $defaults = [
            'db.host'     => 'localhost',
            'db.port'     => 3306,
            'db.name'     => 'pokemon',
            'db.user'     => 'root',
            'db.pass'     => '',
            'db.charset'  => 'utf8mb4',

            // Directory for SSE event logs and other runtime state.
            'storage.path' => \dirname(__DIR__) . '/storage',

            // How long a realtime stream stays open before the client
            // reconnects, in seconds. Keep below the webserver / PHP timeout.
            'realtime.stream_ttl' => 30,
            // Poll interval inside the SSE loop, in microseconds.
            'realtime.tick_us'    => 250000,
            // Events older than this are pruned, in seconds.
            'realtime.retention'  => 120,
            // A player missing for this long drops off the online list.
            'realtime.presence_ttl' => 30,

            'timezone' => 'Asia/Ho_Chi_Minh',
            'debug'    => false,
        ];

        $env = [
            'db.host'    => \getenv('DB_HOST'),
            'db.port'    => \getenv('DB_PORT'),
            'db.name'    => \getenv('DB_NAME'),
            'db.user'    => \getenv('DB_USER'),
            'db.pass'    => \getenv('DB_PASS'),
            'debug'      => \getenv('APP_DEBUG'),
        ];

        foreach ($env as $key => $value) {
            if ($value !== false && $value !== '') {
                $defaults[$key] = $value;
            }
        }

        $localFile = \dirname(__DIR__) . '/config.local.php';
        if (\is_file($localFile)) {
            /** @var mixed $local */
            $local = require $localFile;
            if (\is_array($local)) {
                $defaults = \array_merge($defaults, $local);
            }
        }

        $defaults['db.port'] = (int) $defaults['db.port'];
        $defaults['debug']   = \filter_var($defaults['debug'], \FILTER_VALIDATE_BOOL);

        return self::$values = $defaults;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }
}
