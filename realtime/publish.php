<?php

declare(strict_types=1);

/**
 * The write half of the realtime layer.
 *
 * Everything the client used to push through socket.emit() arrives here as an
 * ordinary POST. The body is the JSON {"event": "...", "args": [...]} that
 * sql/realtime.js builds from the emit() arguments.
 *
 * The acting player is always taken from the session; `args` never carries an
 * identity the server trusts.
 */

require_once \dirname(__DIR__) . '/app/bootstrap.php';

use Pokeh5\Realtime\Bus;
use Pokeh5\Realtime\Server;

\header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    \http_response_code(405);
    echo \json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$userId = (int) ($_SESSION['id'] ?? 0);
if ($userId === 0) {
    \http_response_code(401);
    echo \json_encode(['ok' => false, 'error' => 'unauthorised']);
    exit;
}

$raw = \file_get_contents('php://input');
if ($raw === false || $raw === '' || \strlen($raw) > 64 * 1024) {
    \http_response_code(400);
    echo \json_encode(['ok' => false, 'error' => 'bad_request']);
    exit;
}

/** @var array<string, mixed>|null $body */
$body = \json_decode($raw, true);
if (!\is_array($body) || !isset($body['event']) || !\is_string($body['event'])) {
    \http_response_code(400);
    echo \json_encode(['ok' => false, 'error' => 'bad_request']);
    exit;
}

$args = $body['args'] ?? [];
if (!\is_array($args)) {
    $args = [$args];
}

// Remember the player's map so stream.php can scope map-local events without
// re-reading it from the database on every tick.
if (isset($body['map'])) {
    $_SESSION['realtime_map'] = (int) $body['map'];
}

$server = new Server(new Bus());
$server->handle($body['event'], \array_values($args), $userId);

echo \json_encode(['ok' => true]);
