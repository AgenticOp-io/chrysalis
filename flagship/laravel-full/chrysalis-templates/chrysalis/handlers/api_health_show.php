<?php

declare(strict_types=1);

// Return value only: `routes/chrysalis.php` does `$body = require ...` and PHP
// assigns the require expression (1 on success), not echoed output.
return '{"ok":true,"app":"laravel-full"}';
