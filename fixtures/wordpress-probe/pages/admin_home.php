<?php

if (!is_admin()) {
    wp_die('Forbidden');
}

$can = current_user_can('manage_options');
$nonce = wp_create_nonce('wordpress_probe_admin');

?>
<!doctype html>
<html>
<head><title>WordPress probe admin</title></head>
<body>
  <p>admin=<?= $can ? 'yes' : 'no' ?></p>
  <p>nonce=<?= htmlspecialchars($nonce) ?></p>
</body>
</html>
