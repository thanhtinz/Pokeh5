<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../../src/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json(['ok' => false, 'message' => 'Phương thức không hợp lệ.'], 405);
}

Session::requireCsrf();

$player = $auth->player();
if ($player === null) {
    json(['ok' => false, 'message' => 'Bạn chưa đăng nhập.'], 401);
}

$giftKey = (string) ($_POST['giftkey'] ?? '');

try {
    $result = (new GiftCode())->claim($player['account'], $player['pid'], $giftKey);
} catch (\Throwable $e) {
    error_log('portal: claim failed: ' . $e->getMessage());
    json(['ok' => false, 'message' => 'Có lỗi xảy ra, thử lại sau.'], 500);
}

json(match ($result['status']) {
    GiftCode::OK => ['ok' => true, 'message' => 'Nhận "' . $result['title'] . '" thành công. Kiểm tra hòm thư trong game.'],
    GiftCode::ALREADY_CLAIMED => ['ok' => false, 'message' => 'Bạn đã nhận quà này rồi.'],
    GiftCode::NO_CHARACTER => ['ok' => false, 'message' => 'Tài khoản chưa có nhân vật trong game.'],
    default => ['ok' => false, 'message' => 'Mã quà không tồn tại.'],
});
