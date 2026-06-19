<?php

declare(strict_types=1);

header('Content-Type: text/plain');
echo $_SESSION['user_id'] ?? '';
