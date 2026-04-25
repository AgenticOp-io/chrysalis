<?php



declare(strict_types=1);



header('Content-Type: text/plain; charset=utf-8');



session_name('chrysalis_sid');

session_set_cookie_params([

    'lifetime' => 0,

    'path' => '/',

    'httponly' => true,

    'samesite' => 'Lax',

]);

session_start();



$id = (int) (($_SESSION['user_id'] ?? 0) ?: 0);

if ($id <= 0) {

    echo "user:anon\n";

} else {

    echo 'user:' . $id . "\n";

}

