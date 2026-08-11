<?php

declare(strict_types=1);

namespace Pokeh5;

/**
 * Account creation, login and password handling.
 *
 * Replaces the inline SQL that used to live in data/game/login.php. Three
 * things were wrong there and are fixed here:
 *
 *  1. Registration wrote only six columns. Every other column in `users` is
 *     NOT NULL with no default, so under the strict SQL mode that MySQL 5.7
 *     and MariaDB 10.2 enable by default the INSERT failed outright with
 *     "Field 'code' doesn't have a default value". The old code never checked
 *     the return value of mysql_query(), so the failure was silent and the
 *     character was simply never saved. createCharacter() now supplies a
 *     complete row.
 *
 *  2. Passwords were stored and compared in clear text, and the account panel
 *     displayed them back to the player. They are hashed now; existing clear
 *     text values are re-hashed the first time their owner logs in, so no
 *     account is locked out mid-migration.
 *
 *  3. Credentials were concatenated straight into the query. Every statement
 *     here is prepared and bound.
 */
final class Auth
{
    /** Character and account names: letter first, then 4-19 alphanumerics. */
    public const NAME_PATTERN = '/^[A-Za-z][A-Za-z0-9]{4,19}$/';

    private const HASH_ALGO = \PASSWORD_DEFAULT;

    public static function isValidName(string $name): bool
    {
        return \preg_match(self::NAME_PATTERN, $name) === 1;
    }

    public static function characterNameTaken(string $username): bool
    {
        return Database::value(
            'SELECT 1 FROM `users` WHERE `username` = ? LIMIT 1',
            [$username]
        ) !== null;
    }

    public static function accountNameTaken(string $login): bool
    {
        return Database::value(
            'SELECT 1 FROM `users` WHERE `taikhoan` = ? LIMIT 1',
            [$login]
        ) !== null;
    }

    /**
     * Create a guest character.
     *
     * The player picks a character name and a sprite and starts playing; the
     * login/password pair is attached later by linkAccount() when they talk to
     * an NPC. `test` = 1 marks that not-yet-verified state, which is how the
     * original game modelled it.
     *
     * @return int the new user id
     */
    public static function createCharacter(string $username, string $sprite): int
    {
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            // Every NOT NULL column without a default has to be listed, or the
            // insert is rejected under STRICT_TRANS_TABLES.
            $row = [
                'code'             => '{}',
                'nhiemvu'          => '{}',
                'taikhoan'         => '',
                'username'         => $username,
                'password'         => '',
                'vatpham'          => '{}',
                'item'             => '{}',
                'ducnghia'         => '',
                'sprite'           => $sprite,
                'map'              => \json_encode(['id' => 1, 'x' => 39, 'y' => 29]),
                'sound'            => 1,
                'music'            => 1,
                'xu'               => 0,
                'ruby'             => 0,
                'in_hand'          => 0,
                'ducnghia_pokemon' => 0,
                'ducnghia_level'   => 0,
                'user_id'          => 0, // set to the row id below
                'aantalpokemon'    => 0,
                'exp'              => 0,
                'expmax'           => 1000,
                'level'            => 1,
                'pokemonnv'        => 0,
                'date'             => \time(),
                'giatoc'           => 0,
                'icon'             => 0,
                'viettat'          => '',
                'conghien'         => 0,
                'thang'            => 0,
                'thua'             => 0,
                'auto'             => 0,
                'timeauto'         => 0,
                'data'             => 0,
                'test'             => 1,
                'sukien'           => 0,
                'vuotai'           => 0,
                'boss'             => 0,
                'pk'               => 0,
                'vua'              => 0,
                'top'              => 0,
                'khoa'             => 0,
                'pokemon'          => '',
            ];

            $columns      = \array_keys($row);
            $placeholders = \implode(', ', \array_fill(0, \count($columns), '?'));
            $columnList   = '`' . \implode('`, `', $columns) . '`';

            Database::run(
                "INSERT INTO `users` ({$columnList}) VALUES ({$placeholders})",
                \array_values($row)
            );

            $id = Database::lastInsertId();

            // The schema carries both `id` and `user_id`; the game reads either
            // depending on the file, and they are the same value in every
            // healthy row.
            Database::run('UPDATE `users` SET `user_id` = ? WHERE `id` = ?', [$id, $id]);

            $pdo->commit();

            return $id;
        } catch (\Throwable $e) {
            $pdo->rollBack();

            throw $e;
        }
    }

    /**
     * Attach a login and password to an existing guest character.
     *
     * @throws \RuntimeException when the login name is already in use
     */
    public static function linkAccount(int $userId, string $login, string $password): void
    {
        if (self::accountNameTaken($login)) {
            throw new \RuntimeException('taikhoan_taken');
        }

        Database::run(
            'UPDATE `users` SET `test` = 0, `taikhoan` = ?, `password` = ? WHERE `id` = ?',
            [$login, self::hash($password), $userId]
        );
    }

    /**
     * Verify credentials.
     *
     * @return array<string, mixed>|null the user row, or null when the login
     *                                   name or password does not match
     */
    public static function login(string $login, string $password): ?array
    {
        $user = Database::first(
            'SELECT * FROM `users` WHERE `taikhoan` = ? LIMIT 1',
            [$login]
        );

        // Guest characters have an empty taikhoan; an empty submitted login
        // must not match them.
        if ($user === null || $login === '') {
            // Keep the timing similar whether or not the account exists.
            \password_verify($password, '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG');

            return null;
        }

        if (!self::verify($password, (string) $user['password'])) {
            return null;
        }

        self::upgradeHashIfNeeded((int) $user['id'], $password, (string) $user['password']);

        return $user;
    }

    public static function changePassword(int $userId, string $password): void
    {
        Database::run(
            'UPDATE `users` SET `password` = ? WHERE `id` = ?',
            [self::hash($password), $userId]
        );
    }

    public static function hash(string $password): string
    {
        return \password_hash($password, self::HASH_ALGO);
    }

    /**
     * True when the stored value was produced by password_hash().
     *
     * Anything else is a 2019-era clear text password (or, on databases that
     * saw a partial migration attempt, a bare md5 digest).
     */
    public static function isHashed(string $stored): bool
    {
        $info = \password_get_info($stored);

        return ($info['algo'] ?? null) !== null && $info['algo'] !== 0;
    }

    public static function verify(string $password, string $stored): bool
    {
        if ($stored === '') {
            return false;
        }

        if (self::isHashed($stored)) {
            return \password_verify($password, $stored);
        }

        // Legacy formats, compared without early exit.
        if (\hash_equals($stored, $password)) {
            return true;
        }

        if (\strlen($stored) === 32 && \ctype_xdigit($stored)) {
            return \hash_equals(\strtolower($stored), \md5($password));
        }

        return false;
    }

    /**
     * Re-hash on successful login when the stored value is legacy or the cost
     * parameters have moved on.
     */
    private static function upgradeHashIfNeeded(int $userId, string $password, string $stored): void
    {
        if (self::isHashed($stored) && !\password_needs_rehash($stored, self::HASH_ALGO)) {
            return;
        }

        self::changePassword($userId, $password);
    }
}
