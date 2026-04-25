<?php

declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');
$msg = isset($_POST['msg']) ? trim((string) $_POST['msg']) : '';
if ($msg === '') {
    http_response_code(400);
    echo "msg required\n";
    exit;
}
echo 'echo:' . $msg . "\n";
