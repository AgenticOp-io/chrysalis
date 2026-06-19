<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/wp-core-stubs.php';

add_action('init', 'wordpress_core_stub_bootstrap');
$title = apply_filters('the_title', 'Hello WordPress core stub');
$site = get_bloginfo('name');

function wordpress_core_stub_bootstrap(): void
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
