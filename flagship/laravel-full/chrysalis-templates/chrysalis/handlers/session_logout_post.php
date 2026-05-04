<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

session_name("chrysalis_sid");
session_start();

$_SESSION["user"] = "";
return '{"ok":true}';
