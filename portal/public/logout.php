<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../src/bootstrap.php';

// Logging out changes state, so it is a POST behind a CSRF token rather than a
// link anyone can trigger with an <img> tag.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Session::requireCsrf();
    $auth->logout();
    header('Location: /');
    exit;
}

?>
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><title>Đăng xuất</title><link rel="stylesheet" href="/assets/portal.css"></head>
<body>
<main class="wrap">
  <form method="post" class="card form">
    <input type="hidden" name="csrf" value="<?= e(Session::csrfToken()) ?>">
    <p>Đăng xuất khỏi tài khoản?</p>
    <button type="submit">Đăng xuất</button>
    <a class="btn btn-ghost" href="/">Huỷ</a>
  </form>
</main>
</body>
</html>
