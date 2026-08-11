<?php

declare(strict_types=1);

namespace Pokeh5\Legacy;

use PDOStatement;

/**
 * Stand-in for the ext/mysql result resource.
 *
 * ext/mysql buffered result sets client-side, which is what mysql_num_rows()
 * and mysql_data_seek() depend on. PDOStatement has no rewindable cursor, so
 * rows are read once here and served from memory afterwards.
 */
final class Result
{
    /** @var list<array<string, mixed>> */
    private array $rows;

    private int $cursor = 0;

    /** @param list<array<string, mixed>> $rows */
    public function __construct(array $rows)
    {
        $this->rows = $rows;
    }

    public static function fromStatement(PDOStatement $statement): self
    {
        // Statements for INSERT/UPDATE/DELETE carry no column metadata; the
        // legacy callers only ever check those for truthiness.
        if ($statement->columnCount() === 0) {
            return new self([]);
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $statement->fetchAll();

        return new self($rows);
    }

    public function numRows(): int
    {
        return \count($this->rows);
    }

    public function seek(int $offset): bool
    {
        if ($offset < 0 || $offset >= \count($this->rows)) {
            return false;
        }

        $this->cursor = $offset;

        return true;
    }

    /** @return array<string, mixed>|null */
    public function fetchAssoc(): ?array
    {
        return $this->rows[$this->cursor++] ?? null;
    }

    /**
     * Mirrors MYSQL_BOTH: every column reachable by name and by position.
     *
     * @return array<int|string, mixed>|null
     */
    public function fetchBoth(): ?array
    {
        $row = $this->fetchAssoc();
        if ($row === null) {
            return null;
        }

        $both = [];
        $index = 0;
        foreach ($row as $name => $value) {
            $both[$index++] = $value;
            $both[$name]    = $value;
        }

        return $both;
    }

    /** @return list<mixed>|null */
    public function fetchRow(): ?array
    {
        $row = $this->fetchAssoc();

        return $row === null ? null : \array_values($row);
    }

    public function fetchObject(): ?\stdClass
    {
        $row = $this->fetchAssoc();

        return $row === null ? null : (object) $row;
    }

    public function result(int $row, int|string $field = 0): mixed
    {
        if (!isset($this->rows[$row])) {
            return false;
        }

        $record = $this->rows[$row];

        if (\is_int($field)) {
            $values = \array_values($record);

            return $values[$field] ?? false;
        }

        // ext/mysql accepted both "column" and "table.column" here.
        if (\array_key_exists($field, $record)) {
            return $record[$field];
        }

        $short = \strrchr($field, '.');
        if ($short !== false) {
            $short = \substr($short, 1);
            if (\array_key_exists($short, $record)) {
                return $record[$short];
            }
        }

        return false;
    }
}
