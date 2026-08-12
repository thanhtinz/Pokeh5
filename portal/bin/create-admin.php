<?php

declare(strict_types=1);

namespace Portal;

/**
 * Creates or updates a GM account.
 *
 *   php portal/bin/create-admin.php <username>
 *
 * The password is read from stdin rather than argv so it does not end up in
 * the shell history or in `ps` output.
 */

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy được từ dòng lệnh.\n");
}

require_once __DIR__ . '/../src/Database.php';

$configFile = __DIR__ . '/../config/config.php';
if (!is_file($configFile)) {
    exit("Thiếu portal/config/config.php.\n");
}
$config = require $configFile;

$username = trim((string) ($argv[1] ?? ''));
if ($username === '') {
    exit("Cách dùng: php portal/bin/create-admin.php <username>\n");
}

echo "Mật khẩu cho '$username': ";
$password = read_hidden();
echo "\nNhập lại: ";
$confirm = read_hidden();
echo "\n";

if ($password !== $confirm) {
    exit("Hai mật khẩu không khớp.\n");
}
if (strlen($password) < 10) {
    exit("Mật khẩu phải từ 10 ký tự trở lên.\n");
}

Database::connect($config['db']);
Database::run(
    'INSERT INTO x_portal_admin (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
    [$username, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])],
);

echo "Đã tạo/cập nhật tài khoản GM '$username'.\n";

/** Turns off terminal echo where possible so the password is not displayed. */
function read_hidden(): string
{
    if (DIRECTORY_SEPARATOR === '/' && shell_exec('command -v stty') !== null) {
        shell_exec('stty -echo');
        $value = rtrim((string) fgets(STDIN), "\r\n");
        shell_exec('stty echo');
        return $value;
    }
    return rtrim((string) fgets(STDIN), "\r\n");
}
