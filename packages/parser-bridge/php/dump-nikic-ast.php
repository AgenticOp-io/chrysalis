<?php

declare(strict_types=1);

/**
 * Outputs nikic/php-parser JSON for a single PHP source file (stdout).
 * Used by packages/parser-bridge/providers/nikic.ts (DESIGN.md D195).
 */

require dirname(__DIR__) . '/vendor/autoload.php';

use PhpParser\Error as PhpParseError;
use PhpParser\ParserFactory;

$file = $argv[1] ?? '';
if ($file === '') {
    fwrite(STDERR, "usage: dump-nikic-ast.php <file.php> | dump-nikic-ast.php -\n");
    exit(1);
}

if ($file === '-') {
    $code = stream_get_contents(STDIN);
    if ($code === false || $code === '') {
        fwrite(STDERR, "dump-nikic-ast.php: stdin read failed or empty\n");
        exit(3);
    }
} else {
    $code = file_get_contents($file);
    if ($code === false) {
        fwrite(STDERR, "dump-nikic-ast.php: cannot read file\n");
        exit(3);
    }
}

$parser = (new ParserFactory())->createForNewestSupportedVersion();
try {
    $stmts = $parser->parse($code);
} catch (PhpParseError $e) {
    fwrite(STDERR, $e->getMessage());
    exit(2);
}

try {
    $json = json_encode(
        $stmts,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );
} catch (JsonException $e) {
    fwrite(STDERR, 'dump-nikic-ast.php: json_encode failed: ' . $e->getMessage());
    exit(4);
}

echo $json;
