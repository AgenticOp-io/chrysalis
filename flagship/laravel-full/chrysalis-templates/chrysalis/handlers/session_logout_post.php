<?php

declare(strict_types=1);

session_name("chrysalis_sid");
session_start();

$_SESSION["user"] = "";
return '{"ok":true}';
