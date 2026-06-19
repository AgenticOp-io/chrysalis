<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/wp-load.php';

add_action('init', 'wordpress_customer_sample_bootstrap');
$title = apply_filters('the_title', 'Customer sample home');
$site = get_bloginfo('name');

function wordpress_customer_sample_bootstrap(): void
{
}

?>
<!doctype html>
<html>
<head>
  <title><?= htmlspecialchars($title) ?></title>
  <?php wp_head(); ?>
</head>
<body>
  <h1><?= htmlspecialchars($title) ?></h1>
  <p><?= htmlspecialchars($site) ?></p>
  <?php wp_footer(); ?>
</body>
</html>
