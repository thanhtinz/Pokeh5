<?php

declare(strict_types=1);

namespace Pokeh5\Realtime;

/**
 * Protocol handler for the realtime layer.
 *
 * The original Node/socket.io server was not published with the game, so the
 * client in sql/npm.js and sql/data.js is the only specification of the wire
 * format. Every payload produced here matches what those handlers already
 * expect, which is why neither file needed rewriting beyond swapping the
 * transport.
 *
 * Client sends            Subscribers receive
 * ---------------------   -----------------------------------------------
 * Move, ducnghialogin     nothing directly; updates presence, which is
 *                         broadcast as `nguoichoi`
 * sendchat                `chatall`  (JSON string: id, username, noidung)
 * ducnghia_thegioi        `chatall`
 * chatmap, ducnghia_chat  `chat` and `datachat`, limited to one map
 * pvp_moi                 `pvp_moi`, addressed to the invited player
 * pvp_ok                  `pvp_ok`, addressed to the inviting player
 * kick                    `kick`, admins only
 * out                     nothing; drops the player from presence
 */
final class Server
{
    /** Character id of the administrator account. */
    private const ADMIN_ID = 1;

    private const MAX_CHAT_LENGTH = 500;

    public function __construct(private Bus $bus)
    {
    }

    /**
     * Apply one client message.
     *
     * $userId comes from the session, never from the request body, so a client
     * cannot act as another player.
     *
     * @param list<mixed> $args the arguments the old socket.emit() call passed
     */
    public function handle(string $event, array $args, int $userId): void
    {
        switch ($event) {
            case 'Move':
            case 'ducnghialogin':
                $this->updatePresence((string) ($args[0] ?? ''), $userId);
                break;

            case 'sendchat':
                $this->worldChat($args[0] ?? null, $userId);
                break;

            case 'ducnghia_thegioi':
                $this->worldChat(
                    ['txt' => (string) ($args[0] ?? '')],
                    $userId
                );
                break;

            case 'chatmap':
            case 'ducnghia_chat':
                $this->mapChat($args[0] ?? null, $userId);
                break;

            case 'pvp_moi':
                $target = (int) ($args[0] ?? 0);
                if ($target > 0) {
                    $this->bus->publish('pvp_moi', ['value' => $target], $userId, $target);
                }
                break;

            case 'pvp_ok':
                $target = (int) ($args[0] ?? 0);
                if ($target > 0) {
                    $this->bus->publish('pvp_ok', ['value' => $target], $userId, $target);
                }
                break;

            case 'kick':
                // Anyone could send this before; the old client simply typed
                // "kick <name>" into the chat box.
                if ($userId === self::ADMIN_ID) {
                    $this->bus->publish('kick', ['value' => (string) ($args[0] ?? '')], $userId);
                }
                break;

            case 'out':
                $this->bus->forget($userId);
                break;

            default:
                // Unknown events are dropped rather than relayed, so the log
                // cannot be used as free storage by a crafted client.
                break;
        }
    }

    /**
     * Parse the caret-delimited movement string the client builds in
     * data.js:ketnoi() and store it as this player's presence record.
     *
     * "/ducnghia^id^mapid^x^y^direction^battle^username^skin^icon^viettat^pokemon^exp^xu^camxuc"
     */
    private function updatePresence(string $payload, int $userId): void
    {
        $parts = \explode('^', $payload);

        if (\count($parts) < 12 || $parts[0] !== '/ducnghia') {
            return;
        }

        $this->bus->touchPresence($userId, [
            // The id is taken from the session, not from the payload.
            'id'        => $userId,
            'mapid'     => (int) ($parts[2] ?? 0),
            'map'       => (int) ($parts[2] ?? 0),
            'x'         => (int) ($parts[3] ?? 0),
            'y'         => (int) ($parts[4] ?? 0),
            'direction' => (int) ($parts[5] ?? 0),
            'battle'    => (int) ($parts[6] ?? 0),
            'username'  => (string) ($parts[7] ?? ''),
            'skin'      => (string) ($parts[8] ?? ''),
            'icon'      => (string) ($parts[9] ?? ''),
            'viettat'   => (string) ($parts[10] ?? ''),
            'pokemon'   => (string) ($parts[11] ?? ''),
            'exp'       => (string) ($parts[12] ?? '0'),
            'xu'        => (string) ($parts[13] ?? '0'),
            'camxuc'    => (string) ($parts[14] ?? ''),
        ]);
    }

    /** @param mixed $payload the object the client sends, or a bare string */
    private function worldChat(mixed $payload, int $userId): void
    {
        [$text, $username] = $this->readChat($payload, $userId);

        if ($text === '') {
            return;
        }

        // npm.js does JSON.parse() on this handler's argument, so the payload
        // stays a JSON string rather than an object.
        $this->bus->publish(
            'chatall',
            ['raw' => \json_encode([
                'id'       => $userId,
                'username' => $username,
                'noidung'  => $text,
            ], \JSON_UNESCAPED_UNICODE)],
            $userId,
            null,
            null,
            // The sender already printed their own line locally in
            // chatMessage() before emitting.
            false
        );
    }

    private function mapChat(mixed $payload, int $userId): void
    {
        [$text, $username] = $this->readChat($payload, $userId);
        $mapId             = $this->readMap($payload);

        if ($text === '') {
            return;
        }

        $body = [
            'id'       => $userId,
            'username' => $username,
            'noidung'  => $text,
        ];

        $this->bus->publish(
            'chat',
            ['raw' => \json_encode($body, \JSON_UNESCAPED_UNICODE)],
            $userId,
            null,
            $mapId,
            false
        );

        // `datachat` receives the same content as an object, not a string.
        $this->bus->publish('datachat', $body, $userId, null, $mapId, false);
    }

    /**
     * @return array{0: string, 1: string} sanitised text and display name
     */
    private function readChat(mixed $payload, int $userId): array
    {
        $text     = '';
        $username = '';

        if (\is_array($payload)) {
            $text     = (string) ($payload['txt'] ?? $payload['noidung'] ?? '');
            $username = (string) ($payload['username'] ?? '');
        } elseif (\is_string($payload)) {
            $text = $payload;
        }

        $text = \trim($text);
        if (\mb_strlen($text) > self::MAX_CHAT_LENGTH) {
            $text = \mb_substr($text, 0, self::MAX_CHAT_LENGTH);
        }

        // Chat is written into the page with .html() on the client, so markup
        // has to be neutralised here.
        $text     = \htmlspecialchars($text, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8');
        $username = \htmlspecialchars($username, \ENT_QUOTES | \ENT_SUBSTITUTE, 'UTF-8');

        if ($username === '') {
            $username = (string) ($_SESSION['naam'] ?? ('#' . $userId));
        }

        return [$text, $username];
    }

    private function readMap(mixed $payload): ?int
    {
        if (\is_array($payload) && isset($payload['mapid'])) {
            return (int) $payload['mapid'];
        }

        return null;
    }
}
