<?php

declare(strict_types=1);

namespace Portal;

require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/layout.php';

layout_head($config, 'Nạp thẻ');

$zalo = (string) $config['site']['support_zalo'];
$bank = (string) $config['site']['support_bank'];
?>
<h1>Nạp thẻ</h1>

<?php if ($zalo === '' && $bank === ''): ?>
  <p class="alert">
    Chưa cấu hình thông tin nạp. Đặt <code>SUPPORT_ZALO</code> và <code>SUPPORT_BANK</code>
    trong <code>portal/config/config.php</code>.
  </p>
<?php else: ?>
  <div class="card">
    <?php if ($zalo !== ''): ?><p><strong>Zalo:</strong> <?= e($zalo) ?></p><?php endif; ?>
    <?php if ($bank !== ''): ?><p><strong>Ngân hàng:</strong> <?= e($bank) ?></p><?php endif; ?>
  </div>
<?php endif; ?>

<p class="note">
  Nạp thủ công qua liên hệ. Không có cổng thanh toán tự động trong bản này.
</p>
<?php
layout_foot($config);
