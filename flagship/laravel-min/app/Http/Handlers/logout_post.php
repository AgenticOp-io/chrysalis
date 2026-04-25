<?php



declare(strict_types=1);



session_name('chrysalis_sid');

session_set_cookie_params([

    'lifetime' => 0,

    'path' => '/',

    'httponly' => true,

    'samesite' => 'Lax',

]);

session_start();



$_SESSION['user_id'] = 0;

$_SESSION['csrf'] = 'flagship_csrf_static';



header('Location: /login');

exit;

