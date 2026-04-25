<?php



declare(strict_types=1);



header('Content-Type: text/plain; charset=utf-8');



// Match emitted Hono/Fastify default (`emit-hono` `session.ts`).

session_name('chrysalis_sid');

session_set_cookie_params([

    'lifetime' => 0,

    'path' => '/',

    'httponly' => true,

    'samesite' => 'Lax',

]);

session_start();



$prev = (int) ($_SESSION['visits'] ?? 0);

$n = $prev + 1;

$_SESSION['visits'] = $n;



echo 'visits:' . $n . "\n";

