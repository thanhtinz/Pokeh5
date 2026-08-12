<?php

declare(strict_types=1);

namespace Portal;

/**
 * Admin-sent in-game mail. This is the endpoint the original `gm/insert.php`
 * exposed to anyone who posted an `act` field, letting them grant arbitrary
 * items to arbitrary characters. Every call now runs behind `requireAdmin()`,
 * validates its inputs, and is written to an audit log.
 */
final class GameMail
{
    private const MAX_RECIPIENTS = 200;

    /** @return array{sent: int, skipped: int[]} */
    public function send(
        array $admin,
        string $recipientList,
        string $sender,
        string $items,
        int $serverId,
        string $title,
        string $detail,
    ): array {
        $pids = $this->parseRecipients($recipientList);
        if ($pids === []) {
            throw new \InvalidArgumentException('Danh sách người nhận trống hoặc không hợp lệ.');
        }
        if (count($pids) > self::MAX_RECIPIENTS) {
            throw new \InvalidArgumentException('Tối đa ' . self::MAX_RECIPIENTS . ' người nhận mỗi lần.');
        }

        // Column widths come straight from the game's schema; truncating here
        // beats letting MySQL do it silently in a non-strict mode.
        $sender = $this->clamp($sender, 62);
        $title = $this->clamp($title, 64);
        $detail = $this->clamp($detail, 128);
        $items = $this->clamp($items, 512);

        if ($items === '') {
            throw new \InvalidArgumentException('Danh sách vật phẩm không được để trống.');
        }

        $existing = $this->existingPids($pids);
        $skipped = array_values(array_diff($pids, $existing));

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            foreach ($existing as $pid) {
                Database::run(
                    'INSERT INTO t_player_mails (pid, sender, items, sid, title, detail, `time`)
                     VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [$pid, '[' . $sender . ']', $items, $serverId, $title, $detail],
                );
            }

            Database::run(
                'INSERT INTO x_portal_audit (admin_id, admin_name, action, detail, `time`)
                 VALUES (?, ?, ?, ?, NOW())',
                [
                    $admin['id'],
                    $admin['username'],
                    'send_mail',
                    json_encode([
                        'recipients' => $existing,
                        'items' => $items,
                        'server' => $serverId,
                        'title' => $title,
                    ], JSON_UNESCAPED_UNICODE),
                ],
            );

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return ['sent' => count($existing), 'skipped' => $skipped];
    }

    /** @return int[] */
    private function parseRecipients(string $list): array
    {
        $parts = preg_split('/[\s,;]+/', trim($list)) ?: [];
        $pids = [];
        foreach ($parts as $part) {
            if ($part === '' || !ctype_digit($part)) {
                continue;
            }
            $pids[(int) $part] = true;
        }
        return array_keys($pids);
    }

    /** Filters to characters that actually exist, so typos are reported back. */
    private function existingPids(array $pids): array
    {
        $placeholders = implode(',', array_fill(0, count($pids), '?'));
        $rows = Database::all(
            "SELECT pid FROM t_account WHERE pid IN ($placeholders)",
            $pids,
        );
        return array_map(static fn (array $row): int => (int) $row['pid'], $rows);
    }

    private function clamp(string $value, int $length): string
    {
        return mb_substr(trim($value), 0, $length);
    }

    /** Item lookup for the GM panel's search box. */
    public function searchItems(string $keyword): array
    {
        $keyword = trim($keyword);
        if ($keyword === '') {
            return [];
        }

        // The wildcards are added around a bound parameter, and LIKE
        // metacharacters in the input are escaped so `%` cannot widen the scan.
        $escaped = addcslashes($keyword, '%_\\');
        return Database::all(
            'SELECT uid, name FROM list_items WHERE name LIKE ? ORDER BY name LIMIT 50',
            ['%' . $escaped . '%'],
        );
    }

    public function recentAudit(int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));
        return Database::all(
            "SELECT admin_name, action, detail, `time` FROM x_portal_audit ORDER BY id DESC LIMIT $limit",
        );
    }
}
