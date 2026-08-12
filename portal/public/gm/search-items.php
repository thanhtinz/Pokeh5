<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../../src/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json(['ok' => false, 'message' => 'Phương thức không hợp lệ.'], 405);
}

// The original version of this endpoint was reachable without any login, which
// made the whole item table readable by anyone who found the URL.
$auth->requireAdmin();
Session::requireCsrf();

try {
    $items = (new GameMail())->searchItems((string) ($_POST['keyword'] ?? ''));
} catch (\Throwable $e) {
    error_log('portal: item search failed: ' . $e->getMessage());
    json(['ok' => false, 'message' => 'Có lỗi xảy ra.'], 500);
}

json(['ok' => true, 'items' => $items]);
