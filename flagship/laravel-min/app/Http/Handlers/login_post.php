<?php



declare(strict_types=1);



require_once dirname(__DIR__, 3) . '/lib/db.php';



session_name('chrysalis_sid');

session_set_cookie_params([

    'lifetime' => 0,

    'path' => '/',

    'httponly' => true,

    'samesite' => 'Lax',

]);

session_start();



header('Content-Type: text/plain; charset=utf-8');



$token = trim((string) ($_POST['csrf'] ?? ''));

$expected = (string) ($_SESSION['csrf'] ?? '');

if ($token === '' || $token !== $expected) {

    http_response_code(403);

    echo "csrf rejected\n";

    exit;

}



$username = trim((string) ($_POST['username'] ?? ''));

$password = (string) ($_POST['password'] ?? '');

if ($username === '' || $password === '') {

    http_response_code(400);

    echo "credentials required\n";

    exit;

}



$row = query_one('SELECT id, password FROM users WHERE username = ?', [$username]);

if ($row === null || !password_verify($password, (string) $row['password'])) {

    http_response_code(401);

    echo "invalid credentials\n";

    exit;

}



$_SESSION['user_id'] = (int) $row['id'];

$_SESSION['csrf'] = 'flagship_csrf_static';

header('Location: /session/me');

exit;

