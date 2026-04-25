<?php

declare(strict_types=1);

session_name("chrysalis_sid");
session_start();

if (isset($_SESSION["user"]) && $_SESSION["user"] === "flagship") {
    return '{"user":"flagship"}';
}

return '{"user":null}';
