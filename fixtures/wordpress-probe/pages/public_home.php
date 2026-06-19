<?php

add_action('init', 'wordpress_probe_bootstrap');
$title = apply_filters('the_title', 'Hello WordPress probe');
$site = get_bloginfo('name');

function wordpress_probe_bootstrap(): void
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
