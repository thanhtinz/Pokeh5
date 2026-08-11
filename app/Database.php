<?php

declare(strict_types=1);

namespace Pokeh5;

use PDO;
use PDOStatement;

/**
 * Single PDO connection for the whole game.
 *
 * Everything that used to go through mysql_query() now runs on this handle,
 * either through the compatibility layer in app/Legacy or - for code that has
 * been ported - through the prepared-statement helpers below.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $dsn = \sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            (string) Config::get('db.host'),
            (int) Config::get('db.port'),
            (string) Config::get('db.name'),
            (string) Config::get('db.charset')
        );

        $pdo = new PDO(
            $dsn,
            (string) Config::get('db.user'),
            (string) Config::get('db.pass'),
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Real prepared statements, so placeholders are never
                // interpolated into the SQL string client-side.
                PDO::ATTR_EMULATE_PREPARES   => false,
                // Buffered results, matching the old ext/mysql behaviour that
                // the legacy code relies on for mysql_num_rows/mysql_data_seek.
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
            ]
        );

        return self::$pdo = $pdo;
    }

    /**
     * Run a prepared statement and return the executed PDOStatement.
     *
     * @param array<int|string, mixed> $params
     */
    public static function run(string $sql, array $params = []): PDOStatement
    {
        $statement = self::pdo()->prepare($sql);
        $statement->execute($params);

        return $statement;
    }

    /**
     * @param  array<int|string, mixed> $params
     * @return array<string, mixed>|null
     */
    public static function first(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @param  array<int|string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    /**
     * @param array<int|string, mixed> $params
     */
    public static function value(string $sql, array $params = []): mixed
    {
        $value = self::run($sql, $params)->fetchColumn();

        return $value === false ? null : $value;
    }

    /**
     * @param array<int|string, mixed> $params
     */
    public static function execute(string $sql, array $params = []): int
    {
        return self::run($sql, $params)->rowCount();
    }

    public static function lastInsertId(): int
    {
        return (int) self::pdo()->lastInsertId();
    }

    /** Used by the test bootstrap to inject an in-memory or fixture handle. */
    public static function swap(?PDO $pdo): void
    {
        self::$pdo = $pdo;
    }
}
