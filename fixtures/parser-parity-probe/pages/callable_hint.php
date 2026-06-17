<?php

function run(callable $fn): int
{
    return $fn();
}

echo run(fn (): int => 3);
