<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/wp-core-stubs.php';

if (!is_admin()) {
    wp_die('Forbidden');
}

$can = current_user_can('manage_options');
$nonce = wp_create_nonce('wordpress_core_stub_admin');

?>
<!doctype html>
<html>
<head><title>WordPress core stub admin</title></head>
<body>
  <p>admin=<?= $can ? 'yes' : 'no' ?></p>
  <p>nonce=<?= htmlspecialchars($nonce) ?></p>
</body>
</html>
