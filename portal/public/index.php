<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/layout.php';

layout_head($config, 'Trang chủ');
?>
<h1><?= e($config['site']['name']) ?></h1>

<div class="grid">
  <a class="card tile" href="<?= e($config['site']['play_url']) ?>">
    <h2>Vào game</h2>
    <p>Mở client trên trình duyệt hoặc app.</p>
  </a>
  <a class="card tile" href="/giftcode/">
    <h2>Nhận giftcode</h2>
    <p>Đăng nhập bằng tài khoản game để nhận quà qua hòm thư.</p>
  </a>
  <a class="card tile" href="/naptien.php">
    <h2>Nạp thẻ</h2>
    <p>Thông tin liên hệ nạp.</p>
  </a>
</div>
<?php
layout_foot($config);
