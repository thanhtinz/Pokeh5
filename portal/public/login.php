<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/layout.php';

if ($auth->player() !== null) {
    header('Location: /giftcode/');
    exit;
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Session::requireCsrf();

    $account = trim((string) ($_POST['account'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($auth->loginPlayer($account, $password) !== null) {
        header('Location: /giftcode/');
        exit;
    }

    // One message for every failure mode. Distinguishing "no such account"
    // from "wrong password" hands an attacker a list of valid accounts.
    $error = 'Tài khoản hoặc mật khẩu không đúng, hoặc bạn đã thử quá nhiều lần.';
}

layout_head($config, 'Đăng nhập');
?>
<h1>Đăng nhập</h1>

<?php if ($error !== null): ?>
  <p class="alert alert-bad"><?= e($error) ?></p>
<?php endif; ?>

<form method="post" class="card form">
  <input type="hidden" name="csrf" value="<?= e(Session::csrfToken()) ?>">

  <label for="account">Tài khoản</label>
  <input id="account" name="account" type="text" autocomplete="username" required maxlength="64">

  <label for="password">Mật khẩu</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>

  <button type="submit">Đăng nhập</button>
</form>

<p class="note">Tài khoản được tạo trong game. Trang này chỉ dùng để nhận giftcode.</p>
<?php
layout_foot($config);
