<?php

function merge(int $head, int ...$rest): int
{
    return $head + array_sum($rest);
}

echo merge(1, 2, 3);
