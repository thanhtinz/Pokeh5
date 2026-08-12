<?php

declare(strict_types=1);

namespace Portal;

/**
 * Shared page chrome. The original pages each carried their own copy of the
 * header markup with the previous operator's IP address baked into the links;
 * here the links come from config so a new deployment does not advertise
 * somebody else's server.
 */
function layout_head(array $config, string $title): void
{
    $site = $config['site'];
    ?>
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($site['name']) ?> | <?= e($title) ?></title>
<link rel="stylesheet" href="/assets/portal.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/"><?= e($site['name']) ?></a>
  <nav>
    <a class="btn btn-play" href="<?= e($site['play_url']) ?>">Vào game</a>
    <a class="btn" href="/naptien.php">Nạp thẻ</a>
    <a class="btn" href="/giftcode/">Giftcode</a>
    <?php if (isset($_SESSION[Auth::PLAYER_KEY])): ?>
      <a class="btn btn-ghost" href="/logout.php">Đăng xuất</a>
    <?php else: ?>
      <a class="btn btn-ghost" href="/login.php">Đăng nhập</a>
    <?php endif; ?>
  </nav>
</header>
<main class="wrap">
    <?php
}

function layout_foot(array $config): void
{
    ?>
</main>
<footer class="foot"><?= e($config['site']['name']) ?></footer>
</body>
</html>
    <?php
}
