<?php

declare(strict_types=1);

namespace Portal;

/**
 * Fills `list_items` from the item dump the release ships as `www/gm/log.txt`.
 *
 *   php portal/bin/import-items.php /path/to/log.txt
 *
 * The original project did this with a loop that was pasted into `gm/test.php`,
 * hard-coded to start at line 797, and then commented out. This version is
 * idempotent and reports what it skipped.
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

$path = $argv[1] ?? '';
if ($path === '' || !is_readable($path)) {
    exit("Cách dùng: php portal/bin/import-items.php <đường-dẫn-log.txt>\n");
}

// This is a maintenance job, not part of the request path: the runtime user is
// deliberately read-only on `list_items`. Give it an account that can write,
// via DB_ADMIN_USER / DB_ADMIN_PASS, rather than widening the portal's grants.
$db = $config['db'];
$adminUser = getenv('DB_ADMIN_USER');
if ($adminUser !== false && $adminUser !== '') {
    $db['user'] = $adminUser;
    $db['pass'] = (string) getenv('DB_ADMIN_PASS');
}

Database::connect($db);
$pdo = Database::pdo();

$statement = $pdo->prepare(
    'INSERT INTO list_items (uid, name) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)',
);

$handle = fopen($path, 'rb');
$imported = 0;
$skipped = 0;

$pdo->beginTransaction();
while (($line = fgets($handle)) !== false) {
    // Lines look like "1, tiền vàng" — id, then a name that may itself contain
    // commas, so only the first separator is significant.
    $parts = explode(',', trim($line), 2);
    if (count($parts) !== 2 || !ctype_digit(trim($parts[0]))) {
        $skipped++;
        continue;
    }

    $name = trim($parts[1]);
    if ($name === '') {
        $skipped++;
        continue;
    }

    $statement->execute([(int) trim($parts[0]), mb_substr($name, 0, 190)]);
    $imported++;
}
$pdo->commit();
fclose($handle);

echo "Đã nạp $imported vật phẩm, bỏ qua $skipped dòng không hợp lệ.\n";
