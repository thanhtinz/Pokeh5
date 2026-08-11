<?php

declare(strict_types=1);

/**
 * Server-Sent Events stream - the read half of the realtime layer.
 *
 * Replaces the socket.io connection the client used to open. The browser's
 * EventSource handles reconnection on its own and replays its position through
 * the Last-Event-ID header, so no state is kept between requests.
 *
 * Each connection is deliberately short lived (realtime.stream_ttl, 30s by
 * default). PHP holds a worker for the whole time a stream is open, so a
 * long-lived connection per player would exhaust the process pool; the client
 * reconnects immediately and picks up from its cursor.
 */

require_once \dirname(__DIR__) . '/app/bootstrap.php';

use Pokeh5\Config;
use Pokeh5\Realtime\Bus;

$userId = (int) ($_SESSION['id'] ?? 0);

\header('Content-Type: text/event-stream; charset=utf-8');
\header('Cache-Control: no-cache, no-store, must-revalidate');
\header('Connection: keep-alive');
// nginx buffers proxied responses by default, which would hold events back
// until the connection closed.
\header('X-Accel-Buffering: no');

if ($userId === 0) {
    echo "event: unauthorised\n";
    echo "data: {}\n\n";
    exit;
}

// The session is locked for the lifetime of a request; holding it for the
// whole stream would block every other request from this player.
$mapId = (int) ($_SESSION['realtime_map'] ?? 0);
\session_write_close();

\ignore_user_abort(false);
\set_time_limit(0);

while (\ob_get_level() > 0) {
    \ob_end_flush();
}

$bus = new Bus();

$cursor = (int) ($_SERVER['HTTP_LAST_EVENT_ID'] ?? $_GET['since'] ?? 0);
if ($cursor <= 0) {
    // A fresh connection only wants what happens from now on; replaying the
    // backlog would repeat chat the player has already seen.
    $cursor = $bus->lastId();
}

$deadline     = \time() + (int) Config::get('realtime.stream_ttl', 30);
$tick         = (int) Config::get('realtime.tick_us', 250000);
$lastPresence = 0;

/** @param array<string, mixed>|string $data */
function sse(string $event, mixed $data, ?int $id = null): void
{
    if ($id !== null) {
        echo 'id: ' . $id . "\n";
    }

    echo 'event: ' . $event . "\n";
    echo 'data: ' . \json_encode($data, \JSON_UNESCAPED_UNICODE | \JSON_INVALID_UTF8_SUBSTITUTE) . "\n\n";

    \flush();
}

// Tell the client how long to expect this connection to last.
echo 'retry: 1000' . "\n\n";
\flush();

while (\time() < $deadline) {
    if (\connection_aborted() === 1) {
        break;
    }

    foreach ($bus->since($cursor, $userId, $mapId === 0 ? null : $mapId) as $event) {
        $cursor = (int) $event['id'];
        sse((string) $event['ev'], $event['data'], $cursor);
    }

    // The player list is state, not an event, so it is sent on a timer rather
    // than logged. Once a second is enough for other players' avatars.
    if (\time() - $lastPresence >= 1) {
        $lastPresence = \time();

        $players = $bus->presence();

        sse('nguoichoi', ['ducnghia' => $players]);
        sse('online', ['value' => \count($players)]);
    }

    \usleep($tick);
}

// A comment line keeps proxies from treating the close as an error.
echo ": bye\n\n";
\flush();
