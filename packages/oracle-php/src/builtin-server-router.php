<?php

declare(strict_types=1);

/**
 * Router for `php -S` when `-t` points at a docroot with `index.php`.
 *
 * PHP's built-in server otherwise serves missing extension paths as static 404s.
 * The Oracle prelude is loaded **here** (not via `auto_prepend_file`) because
 * prepend + router interaction can prevent traces from flushing on some platforms.
 *
 * Env (set by `@chrysalis/oracle` `startObserver` when this router is used):
 *   CHRYSALIS_ORACLE_PRELUDE   — absolute path to `oracle-php/src/bootstrap.php`
 *   CHRYSALIS_BUILTIN_DOCROOT  — absolute path to the document root (`-t` target)
 */
$prelude = getenv('CHRYSALIS_ORACLE_PRELUDE');
if (is_string($prelude) && $prelude !== '' && is_file($prelude)) {
    require_once $prelude;
}

$root = getenv('CHRYSALIS_BUILTIN_DOCROOT');
if (!is_string($root) || $root === '') {
    return false;
}

$index = $root . DIRECTORY_SEPARATOR . 'index.php';
if (!is_file($index)) {
    return false;
}

chdir($root);
require $index;
