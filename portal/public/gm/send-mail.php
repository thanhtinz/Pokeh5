<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../../src/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json(['ok' => false, 'message' => 'Phương thức không hợp lệ.'], 405);
}

// Order matters: the admin check comes before anything reads the payload. The
// original endpoint let a request through on the mere presence of a POST field.
$admin = $auth->requireAdmin();
Session::requireCsrf();

try {
    $result = (new GameMail())->send(
        $admin,
        (string) ($_POST['recipients'] ?? ''),
        (string) ($_POST['sender'] ?? 'Admin'),
        (string) ($_POST['items'] ?? ''),
        (int) ($_POST['server'] ?? 0),
        (string) ($_POST['title'] ?? ''),
        (string) ($_POST['detail'] ?? ''),
    );
} catch (\InvalidArgumentException $e) {
    json(['ok' => false, 'message' => $e->getMessage()], 422);
} catch (\Throwable $e) {
    error_log('portal: send mail failed: ' . $e->getMessage());
    json(['ok' => false, 'message' => 'Có lỗi xảy ra, xem log máy chủ.'], 500);
}

$message = "Đã gửi tới {$result['sent']} nhân vật.";
if ($result['skipped'] !== []) {
    $message .= ' Bỏ qua PID không tồn tại: ' . implode(', ', $result['skipped']) . '.';
}

json(['ok' => true, 'message' => $message]);
