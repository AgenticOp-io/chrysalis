<?php

declare(strict_types=1);

session_name("chrysalis_sid");
session_start();

$visits = (int) ($_SESSION["visits"] ?? 0) + 1;
$_SESSION["visits"] = $visits;

return '{"visits":' . $visits . '}';
