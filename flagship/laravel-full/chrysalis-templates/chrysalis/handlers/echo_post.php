<?php

declare(strict_types=1);

$msg = (string) ($_POST["msg"] ?? "");
return '{"msg":"' . $msg . '"}';
