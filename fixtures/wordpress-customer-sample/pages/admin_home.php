<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/wp-load.php';

if (!is_admin()) {
    wp_die('Forbidden');
}

$can = current_user_can('manage_options');
$nonce = wp_create_nonce('wordpress_customer_sample_admin');

?>
<!doctype html>
<html>
<head><title>Customer sample admin</title></head>
<body>
  <p>admin=<?= $can ? 'yes' : 'no' ?></p>
  <p>nonce=<?= htmlspecialchars($nonce) ?></p>
</body>
</html>
