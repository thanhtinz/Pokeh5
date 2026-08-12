<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/layout.php';

$admin = $auth->admin();
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
    Session::requireCsrf();
    if ($auth->loginAdmin(trim((string) ($_POST['username'] ?? '')), (string) ($_POST['password'] ?? ''))) {
        header('Location: /gm/');
        exit;
    }
    $error = 'Sai tài khoản hoặc mật khẩu, hoặc đã thử quá nhiều lần.';
}

layout_head($config, 'GM Panel');

if ($admin === null) {
    ?>
    <h1>GM Panel</h1>
    <?php if ($error !== null): ?><p class="alert alert-bad"><?= e($error) ?></p><?php endif; ?>
    <form method="post" class="card form">
      <input type="hidden" name="csrf" value="<?= e(Session::csrfToken()) ?>">
      <input type="hidden" name="action" value="login">
      <label for="u">Tài khoản GM</label>
      <input id="u" name="username" type="text" autocomplete="username" required>
      <label for="p">Mật khẩu</label>
      <input id="p" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Đăng nhập</button>
    </form>
    <p class="note">
      Tài khoản GM nằm ở bảng <code>x_portal_admin</code>, tách khỏi tài khoản game.
      Tạo bằng <code>php portal/bin/create-admin.php</code>.
    </p>
    <?php
    layout_foot($config);
    exit;
}

$audit = (new GameMail())->recentAudit(20);
?>
<h1>GM Panel</h1>
<p class="note">Đang đăng nhập: <strong><?= e($admin['username']) ?></strong></p>

<div id="feedback" class="alert" hidden></div>

<div class="card">
  <h2>Gửi thư kèm vật phẩm</h2>
  <form id="mail-form" class="form">
    <input type="hidden" name="csrf" value="<?= e(Session::csrfToken()) ?>">

    <label for="recipients">PID người nhận (cách nhau bởi dấu phẩy)</label>
    <input id="recipients" name="recipients" type="text" required placeholder="1001, 1002">

    <label for="sender">Người gửi</label>
    <input id="sender" name="sender" type="text" value="Admin" required maxlength="62">

    <label for="server">Server ID</label>
    <input id="server" name="server" type="number" value="1" required min="0">

    <label for="title">Tiêu đề</label>
    <input id="title" name="title" type="text" required maxlength="64">

    <label for="detail">Nội dung</label>
    <input id="detail" name="detail" type="text" required maxlength="128">

    <label for="items">Vật phẩm</label>
    <input id="items" name="items" type="text" required maxlength="512" placeholder="itemId,số lượng;...">

    <button type="submit">Gửi</button>
  </form>
</div>

<div class="card">
  <h2>Tra cứu vật phẩm</h2>
  <div class="form">
    <input id="item-search" type="text" placeholder="Tên vật phẩm">
    <button id="item-search-btn" type="button">Tìm</button>
  </div>
  <div id="item-results" class="note"></div>
</div>

<div class="card">
  <h2>Nhật ký thao tác</h2>
  <?php if ($audit === []): ?>
    <p class="note">Chưa có thao tác nào.</p>
  <?php else: ?>
    <table class="table">
      <?php foreach ($audit as $row): ?>
        <tr>
          <td><?= e($row['time']) ?></td>
          <td><?= e($row['admin_name']) ?></td>
          <td><?= e($row['action']) ?></td>
          <td class="note"><?= e(mb_substr((string) $row['detail'], 0, 120)) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>

<script>
  const feedback = document.getElementById('feedback');
  function show(message, ok) {
    feedback.textContent = message;
    feedback.className = 'alert ' + (ok ? 'alert-good' : 'alert-bad');
    feedback.hidden = false;
  }

  document.getElementById('mail-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = new URLSearchParams(new FormData(event.target));
    const response = await fetch('/gm/send-mail.php', { method: 'POST', body });
    const result = await response.json();
    show(result.message, result.ok);
  });

  document.getElementById('item-search-btn').addEventListener('click', async () => {
    const keyword = document.getElementById('item-search').value;
    const body = new URLSearchParams({
      csrf: document.querySelector('input[name=csrf]').value,
      keyword,
    });
    const response = await fetch('/gm/search-items.php', { method: 'POST', body });
    const result = await response.json();
    const target = document.getElementById('item-results');
    target.replaceChildren();

    if (!result.ok || result.items.length === 0) {
      target.textContent = result.ok ? 'Không tìm thấy.' : result.message;
      return;
    }
    // Built as DOM nodes rather than an HTML string: item names come from the
    // database and must never be parsed as markup.
    for (const item of result.items) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = item.uid + ' — ' + item.name;
      chip.addEventListener('click', () => {
        document.getElementById('items').value = item.uid;
      });
      target.append(chip, ' ');
    }
  });
</script>
<?php
layout_foot($config);
