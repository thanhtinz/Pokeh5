<?php

declare(strict_types=1);

namespace Portal;

/**
 * Two separate logins, on purpose.
 *
 * Player accounts live in `t_account`, whose `password` column is `char(32)`
 * holding an unsalted MD5. That format is not the portal's to change: the
 * closed-source .NET game services read and write the same column, so
 * upgrading it here would lock every player out of the game itself. Player
 * login therefore still verifies MD5 — but through a prepared statement and a
 * constant-time comparison, with attempts rate limited.
 *
 * Portal administrators live in `x_portal_admin`, a table this project owns
 * outright, so those passwords use bcrypt. The GM panel is portal-only, which
 * is what makes that possible.
 */
final class Auth
{
    public const PLAYER_KEY = 'player';
    public const ADMIN_KEY = 'admin';

    public function __construct(
        private readonly int $maxAttempts,
        private readonly int $windowSeconds,
    ) {
    }

    // ------------------------------------------------------------- players

    public function loginPlayer(string $account, string $password): ?array
    {
        if ($account === '' || $password === '') {
            return null;
        }
        if ($this->isLockedOut($account)) {
            return null;
        }

        $row = Database::one(
            'SELECT account, pid, password FROM t_account WHERE account = ? LIMIT 1',
            [$account],
        );

        // Hash the candidate regardless of whether the account exists, so the
        // response time does not reveal which accounts are real.
        $candidate = md5($password);
        $stored = is_string($row['password'] ?? null) ? $row['password'] : str_repeat('0', 32);

        if ($row === null || !hash_equals($stored, $candidate)) {
            $this->recordFailure($account);
            return null;
        }

        $this->clearFailures($account);
        Session::regenerate();
        $_SESSION[self::PLAYER_KEY] = [
            'account' => $row['account'],
            'pid' => $row['pid'] !== null ? (int) $row['pid'] : null,
        ];
        return $_SESSION[self::PLAYER_KEY];
    }

    public function player(): ?array
    {
        $player = $_SESSION[self::PLAYER_KEY] ?? null;
        return is_array($player) ? $player : null;
    }

    public function requirePlayer(): array
    {
        $player = $this->player();
        if ($player === null) {
            header('Location: /login.php');
            exit;
        }
        return $player;
    }

    // -------------------------------------------------------------- admins

    public function loginAdmin(string $username, string $password): bool
    {
        if ($username === '' || $password === '') {
            return false;
        }
        if ($this->isLockedOut('admin:' . $username)) {
            return false;
        }

        $row = Database::one(
            'SELECT id, username, password_hash FROM x_portal_admin WHERE username = ? LIMIT 1',
            [$username],
        );

        $hash = is_string($row['password_hash'] ?? null)
            ? $row['password_hash']
            // A valid-shaped dummy so password_verify still does the work when
            // the account does not exist.
            : '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ak.';

        if (!password_verify($password, $hash) || $row === null) {
            $this->recordFailure('admin:' . $username);
            return false;
        }

        if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12])) {
            Database::run('UPDATE x_portal_admin SET password_hash = ? WHERE id = ?', [
                password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
                $row['id'],
            ]);
        }

        $this->clearFailures('admin:' . $username);
        Session::regenerate();
        $_SESSION[self::ADMIN_KEY] = ['id' => (int) $row['id'], 'username' => $row['username']];
        return true;
    }

    public function admin(): ?array
    {
        $admin = $_SESSION[self::ADMIN_KEY] ?? null;
        return is_array($admin) ? $admin : null;
    }

    /**
     * Every GM endpoint calls this. The original code gated on
     * `isset($_SESSION['uid']) or isset($_POST['act'])`, so posting an `act`
     * field was enough to skip the check entirely.
     */
    public function requireAdmin(): array
    {
        $admin = $this->admin();
        if ($admin === null) {
            http_response_code(403);
            exit('Không có quyền.');
        }
        return $admin;
    }

    // --------------------------------------------------------- rate limits

    private function isLockedOut(string $key): bool
    {
        $row = Database::one(
            'SELECT attempts, last_attempt FROM x_portal_login_attempt WHERE id_key = ? LIMIT 1',
            [$key],
        );
        if ($row === null) {
            return false;
        }

        $age = time() - strtotime((string) $row['last_attempt']);
        if ($age > $this->windowSeconds) {
            $this->clearFailures($key);
            return false;
        }
        return (int) $row['attempts'] >= $this->maxAttempts;
    }

    private function recordFailure(string $key): void
    {
        Database::run(
            'INSERT INTO x_portal_login_attempt (id_key, attempts, last_attempt)
             VALUES (?, 1, NOW())
             ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()',
            [$key],
        );
    }

    private function clearFailures(string $key): void
    {
        Database::run('DELETE FROM x_portal_login_attempt WHERE id_key = ?', [$key]);
    }

    public function logout(): void
    {
        Session::destroy();
    }
}
