<?php

function mask(int $a, int $b): int
{
    return $a | $b;
}

echo mask(1, 2);
