<?php

declare(strict_types=1);

namespace Portal;

/**
 * Session and CSRF handling. The original portal called `session_start()` with
 * default settings and had no CSRF token anywhere, so any page on the internet
 * could make a logged-in player claim gifts or an admin send items.
 */
final class Session
{
    public static function start(bool $secureCookies): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'secure' => $secureCookies,
            // Lax still allows normal top-level navigation into the site while
            // blocking the cross-site POSTs that CSRF relies on.
            'samesite' => 'Lax',
        ]);
        session_name('POKEPORTAL');
        session_start();
    }

    /** Called on every privilege change, so a fixated session id is useless. */
    public static function regenerate(): void
    {
        session_regenerate_id(true);
    }

    public static function destroy(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf'];
    }

    public static function checkCsrf(?string $token): bool
    {
        return is_string($token)
            && !empty($_SESSION['csrf'])
            && hash_equals($_SESSION['csrf'], $token);
    }

    /** Aborts the request unless the submitted token matches. */
    public static function requireCsrf(): void
    {
        if (!self::checkCsrf($_POST['csrf'] ?? null)) {
            http_response_code(419);
            exit('Phiên làm việc đã hết hạn, vui lòng tải lại trang.');
        }
    }
}
