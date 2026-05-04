<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

session_name("chrysalis_sid");
session_start();

$username = (string) ($_POST["username"] ?? "");
if ($username === "flagship") {
    $_SESSION["user"] = "flagship";
    return '{"ok":true}';
}

return '{"ok":false}';
