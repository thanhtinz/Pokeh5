<?php

declare(strict_types=1);

/**
 * ext/mysql compatibility layer.
 *
 * The mysql_* extension was removed in PHP 7.0 and the game calls it about
 * 1,650 times across 209 files. Rewriting every call site by hand would mean
 * touching essentially the whole codebase at once; instead each function is
 * reimplemented on top of the PDO handle in Pokeh5\Database, so the legacy
 * call sites keep working while running on a modern, exception-checked driver.
 *
 * New code should call Pokeh5\Database::run()/first()/all() with bound
 * parameters. These shims are a bridge, not a destination - see MIGRATION.md.
 */

use Pokeh5\Database;
use Pokeh5\Legacy\Result;

if (!\function_exists('mysql_query')) {
    /** Last driver error, exposed through mysql_error()/mysql_errno(). */
    $GLOBALS['__pokeh5_mysql_error'] = '';
    $GLOBALS['__pokeh5_mysql_errno'] = 0;

    function __pokeh5_mysql_remember_error(\Throwable $e): void
    {
        $GLOBALS['__pokeh5_mysql_error'] = $e->getMessage();
        $GLOBALS['__pokeh5_mysql_errno'] = (int) $e->getCode();

        if (\Pokeh5\Config::get('debug') === true) {
            \error_log('[pokeh5][sql] ' . $e->getMessage());
        }
    }

    /**
     * Connecting is handled lazily by Pokeh5\Database; this exists only so the
     * `mysql_connect(...) OR die(...)` lines in the old bootstrap still parse
     * and succeed.
     */
    function mysql_connect(
        ?string $host = null,
        ?string $username = null,
        ?string $password = null,
        bool $new_link = false,
        int $client_flags = 0
    ): object|false {
        try {
            Database::pdo();
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return false;
        }

        // ext/mysql handed back a resource. Any object is truthy and can be
        // passed around as the optional $link argument below.
        return new \stdClass();
    }

    function mysql_pconnect(
        ?string $host = null,
        ?string $username = null,
        ?string $password = null,
        int $client_flags = 0
    ): object|false {
        return mysql_connect($host, $username, $password);
    }

    /**
     * The database is chosen by the DSN, so this only reports whether the
     * requested name matches the configured one.
     */
    function mysql_select_db(string $database_name, mixed $link = null): bool
    {
        return $database_name === '' || $database_name === (string) \Pokeh5\Config::get('db.name');
    }

    function mysql_query(string $query, mixed $link = null): Result|bool
    {
        try {
            $statement = Database::pdo()->query($query);
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return false;
        }

        if ($statement === false) {
            return false;
        }

        // Writes returned `true` under ext/mysql, reads returned a resource.
        if ($statement->columnCount() === 0) {
            return true;
        }

        return Result::fromStatement($statement);
    }

    function mysql_unbuffered_query(string $query, mixed $link = null): Result|bool
    {
        return mysql_query($query, $link);
    }

    function mysql_real_escape_string(mixed $unescaped_string, mixed $link = null): string
    {
        $value = (string) $unescaped_string;

        try {
            $quoted = Database::pdo()->quote($value);
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return \addslashes($value);
        }

        // PDO::quote() wraps the value in quotes; the legacy call sites add
        // their own, so strip the outer pair back off.
        if (\strlen($quoted) >= 2 && $quoted[0] === "'" && \substr($quoted, -1) === "'") {
            return \substr($quoted, 1, -1);
        }

        return $quoted;
    }

    function mysql_escape_string(mixed $unescaped_string): string
    {
        return mysql_real_escape_string($unescaped_string);
    }

    /** @return array<int|string, mixed>|false */
    function mysql_fetch_array(mixed $result, int $result_type = 3): array|false
    {
        if (!$result instanceof Result) {
            return false;
        }

        $row = match ($result_type) {
            1       => $result->fetchAssoc(),   // MYSQL_ASSOC
            2       => $result->fetchRow(),     // MYSQL_NUM
            default => $result->fetchBoth(),    // MYSQL_BOTH
        };

        return $row ?? false;
    }

    /** @return array<string, mixed>|false */
    function mysql_fetch_assoc(mixed $result): array|false
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->fetchAssoc() ?? false;
    }

    /** @return list<mixed>|false */
    function mysql_fetch_row(mixed $result): array|false
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->fetchRow() ?? false;
    }

    function mysql_fetch_object(mixed $result, ?string $class_name = null): object|false
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->fetchObject() ?? false;
    }

    function mysql_num_rows(mixed $result): int|false
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->numRows();
    }

    function mysql_data_seek(mixed $result, int $row_number): bool
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->seek($row_number);
    }

    function mysql_result(mixed $result, int $row, int|string $field = 0): mixed
    {
        if (!$result instanceof Result) {
            return false;
        }

        return $result->result($row, $field);
    }

    function mysql_insert_id(mixed $link = null): int
    {
        try {
            return (int) Database::pdo()->lastInsertId();
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return 0;
        }
    }

    function mysql_affected_rows(mixed $link = null): int
    {
        // ext/mysql reported the row count of the most recent write. PDO keeps
        // that on the statement, which the shim discards for writes, so fall
        // back to a driver round-trip.
        try {
            $row = Database::pdo()->query('SELECT ROW_COUNT()');

            return $row === false ? -1 : (int) $row->fetchColumn();
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return -1;
        }
    }

    function mysql_error(mixed $link = null): string
    {
        return (string) $GLOBALS['__pokeh5_mysql_error'];
    }

    function mysql_errno(mixed $link = null): int
    {
        return (int) $GLOBALS['__pokeh5_mysql_errno'];
    }

    function mysql_free_result(mixed $result): bool
    {
        return true;
    }

    function mysql_close(mixed $link = null): bool
    {
        return true;
    }

    function mysql_ping(mixed $link = null): bool
    {
        try {
            Database::pdo()->query('SELECT 1');

            return true;
        } catch (\PDOException $e) {
            __pokeh5_mysql_remember_error($e);

            return false;
        }
    }

    function mysql_set_charset(string $charset, mixed $link = null): bool
    {
        // The charset is fixed by the DSN.
        return true;
    }

    function mysql_real_connect(mixed $link = null): bool
    {
        return true;
    }
}
