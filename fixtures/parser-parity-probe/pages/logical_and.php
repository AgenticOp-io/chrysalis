<?php

function both(bool $a, bool $b): bool
{
    return $a && $b;
}

echo both(true, false) ? '1' : '0';
