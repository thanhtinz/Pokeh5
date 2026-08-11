<?php

declare(strict_types=1);

namespace Pokeh5\Realtime;

use Pokeh5\Config;

/**
 * The message bus behind the realtime layer.
 *
 * The game used to reach a Node/socket.io process over a WebSocket. That
 * process was never part of the release, the client only ever had the
 * placeholder URL 'URLSOCKEY', and running it meant operating a second
 * service next to PHP. This replaces it with an append-only event log plus a
 * presence table, both plain files under storage/, read back over
 * Server-Sent Events - no daemon, no extra port, and it works on any host that
 * can run PHP.
 *
 * Events are addressed either to everyone (`to` is null) or to a single
 * player. Filtering happens on read, in since().
 */
final class Bus
{
    private string $directory;
    private string $eventsFile;
    private string $presenceFile;
    private string $sequenceFile;

    public function __construct(?string $directory = null)
    {
        $this->directory = $directory
            ?? (string) Config::get('storage.path') . '/realtime';

        if (!\is_dir($this->directory)) {
            @\mkdir($this->directory, 0775, true);
        }

        $this->eventsFile   = $this->directory . '/events.jsonl';
        $this->presenceFile = $this->directory . '/presence.json';
        $this->sequenceFile = $this->directory . '/sequence';
    }

    /**
     * Append an event.
     *
     * @param  array<string, mixed> $data
     * @param  int|null             $to   addressee, or null to broadcast
     * @return int                  the event id, usable as a cursor
     */
    public function publish(
        string $event,
        array $data,
        int $from = 0,
        ?int $to = null,
        ?int $map = null,
        bool $echoToSender = true
    ): int {
        $id = $this->nextId();

        $record = [
            'id'   => $id,
            'ts'   => \time(),
            'ev'   => $event,
            'from' => $from,
            'to'   => $to,
            'map'  => $map,
            'echo' => $echoToSender,
            'data' => $data,
        ];

        $line = \json_encode($record, \JSON_UNESCAPED_UNICODE | \JSON_INVALID_UTF8_SUBSTITUTE) . "\n";

        // Appends below PIPE_BUF are atomic with O_APPEND, and the exclusive
        // lock covers the larger ones as well as concurrent prunes.
        $handle = \fopen($this->eventsFile, 'ab');
        if ($handle === false) {
            return $id;
        }

        \flock($handle, \LOCK_EX);
        \fwrite($handle, $line);
        \fflush($handle);
        \flock($handle, \LOCK_UN);
        \fclose($handle);

        $this->pruneOccasionally();

        return $id;
    }

    /**
     * Events newer than $cursor that $viewerId is allowed to see.
     *
     * @param  int|null $viewerId null means "broadcasts only"
     * @param  int|null $map      when set, events tagged with a different map
     *                            are dropped
     * @return list<array<string, mixed>>
     */
    public function since(int $cursor, ?int $viewerId, ?int $map = null): array
    {
        if (!\is_file($this->eventsFile)) {
            return [];
        }

        $handle = \fopen($this->eventsFile, 'rb');
        if ($handle === false) {
            return [];
        }

        \flock($handle, \LOCK_SH);

        $events = [];
        while (($line = \fgets($handle)) !== false) {
            $line = \trim($line);
            if ($line === '') {
                continue;
            }

            /** @var array<string, mixed>|null $record */
            $record = \json_decode($line, true);
            if (!\is_array($record) || ($record['id'] ?? 0) <= $cursor) {
                continue;
            }

            $to = $record['to'] ?? null;
            if ($to !== null && $to !== $viewerId) {
                continue;
            }

            // Movement is published with echo off: a player already drew their
            // own step locally and must not receive it back. Chat keeps echo
            // on, so the sender sees their own line in the log.
            if (
                ($record['echo'] ?? true) === false
                && $viewerId !== null
                && ($record['from'] ?? 0) === $viewerId
            ) {
                continue;
            }

            if ($map !== null && ($record['map'] ?? null) !== null && $record['map'] !== $map) {
                continue;
            }

            $events[] = $record;
        }

        \flock($handle, \LOCK_UN);
        \fclose($handle);

        return $events;
    }

    /** The id of the most recent event, for a client that only wants what happens next. */
    public function lastId(): int
    {
        $raw = @\file_get_contents($this->sequenceFile);

        return $raw === false ? 0 : (int) $raw;
    }

    /**
     * Record that a player is online, and where.
     *
     * @param array<string, mixed> $meta
     */
    public function touchPresence(int $userId, array $meta): void
    {
        $this->withPresence(function (array $players) use ($userId, $meta): array {
            $existing = $players[$userId] ?? [];

            $players[$userId] = \array_merge($existing, $meta, [
                'id'   => $userId,
                'seen' => \time(),
            ]);

            return $players;
        });
    }

    /**
     * Players seen recently, optionally limited to one map.
     *
     * @return list<array<string, mixed>>
     */
    public function presence(?int $map = null): array
    {
        $ttl     = (int) Config::get('realtime.presence_ttl', 30);
        $cutoff  = \time() - $ttl;
        $players = $this->readPresence();

        $out = [];
        foreach ($players as $player) {
            if (($player['seen'] ?? 0) < $cutoff) {
                continue;
            }

            if ($map !== null && (int) ($player['map'] ?? 0) !== $map) {
                continue;
            }

            $out[] = $player;
        }

        return $out;
    }

    public function forget(int $userId): void
    {
        $this->withPresence(static function (array $players) use ($userId): array {
            unset($players[$userId]);

            return $players;
        });
    }

    /** Drop every event and every presence record. Used by the tests. */
    public function reset(): void
    {
        @\unlink($this->eventsFile);
        @\unlink($this->presenceFile);
        @\unlink($this->sequenceFile);
    }

    private function nextId(): int
    {
        $handle = \fopen($this->sequenceFile, 'c+b');
        if ($handle === false) {
            return \random_int(1, \PHP_INT_MAX);
        }

        \flock($handle, \LOCK_EX);

        $current = (int) \stream_get_contents($handle);
        $next    = $current + 1;

        \ftruncate($handle, 0);
        \rewind($handle);
        \fwrite($handle, (string) $next);
        \fflush($handle);

        \flock($handle, \LOCK_UN);
        \fclose($handle);

        return $next;
    }

    /** @return array<int, array<string, mixed>> */
    private function readPresence(): array
    {
        $raw = @\file_get_contents($this->presenceFile);
        if ($raw === false || $raw === '') {
            return [];
        }

        /** @var array<int, array<string, mixed>>|null $players */
        $players = \json_decode($raw, true);

        return \is_array($players) ? $players : [];
    }

    /**
     * Read-modify-write the presence file under an exclusive lock.
     *
     * @param callable(array<int, array<string, mixed>>): array<int, array<string, mixed>> $mutator
     */
    private function withPresence(callable $mutator): void
    {
        $handle = \fopen($this->presenceFile, 'c+b');
        if ($handle === false) {
            return;
        }

        \flock($handle, \LOCK_EX);

        $raw     = \stream_get_contents($handle);
        $players = \is_string($raw) && $raw !== '' ? \json_decode($raw, true) : [];
        if (!\is_array($players)) {
            $players = [];
        }

        $players = $mutator($players);

        \ftruncate($handle, 0);
        \rewind($handle);
        \fwrite($handle, \json_encode($players, \JSON_UNESCAPED_UNICODE));
        \fflush($handle);

        \flock($handle, \LOCK_UN);
        \fclose($handle);
    }

    /**
     * Trim the log so it does not grow without bound.
     *
     * Cheap check first: only stat-based, and only rewrites once the file is
     * actually large.
     */
    private function pruneOccasionally(): void
    {
        \clearstatcache(true, $this->eventsFile);
        $size = @\filesize($this->eventsFile);

        if ($size === false || $size < 512 * 1024) {
            return;
        }

        $retention = (int) Config::get('realtime.retention', 120);
        $cutoff    = \time() - $retention;

        $handle = \fopen($this->eventsFile, 'c+b');
        if ($handle === false) {
            return;
        }

        if (!\flock($handle, \LOCK_EX | \LOCK_NB)) {
            // Another request is already pruning.
            \fclose($handle);

            return;
        }

        $kept = '';
        \rewind($handle);
        while (($line = \fgets($handle)) !== false) {
            $record = \json_decode(\trim($line), true);
            if (\is_array($record) && ($record['ts'] ?? 0) >= $cutoff) {
                $kept .= $line;
            }
        }

        \ftruncate($handle, 0);
        \rewind($handle);
        \fwrite($handle, $kept);
        \fflush($handle);

        \flock($handle, \LOCK_UN);
        \fclose($handle);
    }
}
