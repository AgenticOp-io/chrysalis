<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/wp-load.php';

header('Content-Type: application/json; charset=utf-8');

$title = apply_filters('the_title', 'Sample post');
echo json_encode(array('id' => 1, 'title' => $title, 'status' => 'publish'));
