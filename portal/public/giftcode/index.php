<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/layout.php';

$player = $auth->requirePlayer();
$gifts = new GiftCode();

$available = $gifts->available($player['account']);
$claimed = $gifts->claimed($player['account']);

layout_head($config, 'Nhận quà');
?>
<h1>Giftcode</h1>
<p class="note">Tài khoản: <strong><?= e($player['account']) ?></strong></p>

<?php if ($player['pid'] === null): ?>
  <p class="alert alert-bad">
    Tài khoản này chưa có nhân vật. Vào game tạo nhân vật trước khi nhận quà.
  </p>
<?php endif; ?>

<div id="feedback" class="alert" hidden></div>

<div class="card">
  <h2>Quà chưa nhận</h2>
  <?php if ($available === []): ?>
    <p class="note">Bạn đã nhận hết quà hiện có.</p>
  <?php else: ?>
    <table class="table">
      <?php foreach ($available as $gift): ?>
        <tr>
          <td><?= e($gift['title']) ?></td>
          <td>
            <button class="claim" data-key="<?= e($gift['giftkey']) ?>"
                    <?= $player['pid'] === null ? 'disabled' : '' ?>>Nhận</button>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>

<?php if ($claimed !== []): ?>
  <div class="card">
    <h2>Đã nhận</h2>
    <table class="table">
      <?php foreach ($claimed as $row): ?>
        <tr><td><?= e($row['title']) ?></td><td class="note"><?= e($row['time']) ?></td></tr>
      <?php endforeach; ?>
    </table>
  </div>
<?php endif; ?>

<script>
  // The CSRF token travels with every claim; the endpoint rejects the request
  // without it, so another site cannot spend a player's gifts for them.
  const CSRF = <?= json_encode(Session::csrfToken()) ?>;
  const feedback = document.getElementById('feedback');

  function show(message, ok) {
    feedback.textContent = message;
    feedback.className = 'alert ' + (ok ? 'alert-good' : 'alert-bad');
    feedback.hidden = false;
  }

  document.querySelectorAll('button.claim').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const response = await fetch('/giftcode/claim.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrf: CSRF, giftkey: button.dataset.key }),
        });
        const result = await response.json();
        show(result.message, result.ok);
        if (result.ok) {
          button.closest('tr').remove();
        } else {
          button.disabled = false;
        }
      } catch (error) {
        show('Không kết nối được máy chủ.', false);
        button.disabled = false;
      }
    });
  });
</script>
<?php
layout_foot($config);
