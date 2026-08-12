<?php

declare(strict_types=1);

namespace Portal;

use PDOException;

/**
 * Gift code redemption. Two things were wrong with the original: the code was
 * interpolated straight into SQL, and the "already claimed" check was a plain
 * SELECT followed by an INSERT, so two simultaneous requests both passed the
 * check and both handed out the reward.
 */
final class GiftCode
{
    public const OK = 'ok';
    public const UNKNOWN = 'unknown';
    public const ALREADY_CLAIMED = 'already';
    public const NO_CHARACTER = 'no_character';

    /** @return array{status: string, title?: string} */
    public function claim(string $account, ?int $pid, string $giftKey): array
    {
        $giftKey = trim($giftKey);
        if ($giftKey === '') {
            return ['status' => self::UNKNOWN];
        }

        $gift = Database::one(
            'SELECT title, noidung, items, server FROM x_listgift WHERE giftkey = ? LIMIT 1',
            [$giftKey],
        );
        if ($gift === null) {
            return ['status' => self::UNKNOWN];
        }

        // The reward is delivered as in-game mail addressed to a character id,
        // so an account that has never entered the game has nowhere to put it.
        if ($pid === null) {
            return ['status' => self::NO_CHARACTER];
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            // The unique key on (uid, keygift) is what actually prevents a
            // double claim; this insert is the claim, not a check before one.
            Database::run(
                'INSERT INTO x_keygift (uid, keygift, `time`) VALUES (?, ?, NOW())',
                [$account, $giftKey],
            );

            Database::run(
                'INSERT INTO t_player_mails (pid, sender, items, sid, title, detail, `time`)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                    $pid,
                    '[Admin]',
                    (string) $gift['items'],
                    (int) $gift['server'],
                    (string) $gift['title'],
                    (string) $gift['noidung'],
                ],
            );

            $pdo->commit();
            return ['status' => self::OK, 'title' => (string) $gift['title']];
        } catch (PDOException $e) {
            $pdo->rollBack();

            // 23000 is the integrity-constraint class; here it means the
            // unique key rejected a second claim, which is the intended path.
            if ($e->getCode() === '23000') {
                return ['status' => self::ALREADY_CLAIMED];
            }
            error_log('portal: gift claim failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /** Codes the account has not claimed yet. */
    public function available(string $account): array
    {
        return Database::all(
            'SELECT g.giftkey, g.title
               FROM x_listgift g
          LEFT JOIN x_keygift k ON k.keygift = g.giftkey AND k.uid = ?
              WHERE k.id IS NULL
           ORDER BY g.id',
            [$account],
        );
    }

    public function claimed(string $account): array
    {
        return Database::all(
            'SELECT g.title, k.`time`
               FROM x_keygift k
               JOIN x_listgift g ON g.giftkey = k.keygift
              WHERE k.uid = ?
           ORDER BY k.`time` DESC',
            [$account],
        );
    }
}
