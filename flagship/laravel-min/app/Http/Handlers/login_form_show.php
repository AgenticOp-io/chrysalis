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



$_SESSION['csrf'] = 'flagship_csrf_static';



header('Content-Type: text/html; charset=utf-8');

$csrf = htmlspecialchars((string) $_SESSION['csrf']);

echo '<!DOCTYPE html><html><head><title>Login</title></head><body>';

echo '<form method="post" action="/login">';

echo '<input type="hidden" name="csrf" value="' . $csrf . '"/>';

echo '<input name="username" value="flagship" autocomplete="username"/>';

echo '<input type="password" name="password" autocomplete="current-password"/>';

echo '<button type="submit">Login</button></form></body></html>';

