<?php

function cmp(int $a, int $b): int
{
    return $a <=> $b;
}

echo cmp(1, 2);
