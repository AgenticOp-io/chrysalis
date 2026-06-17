<?php

enum Priority: int
{
    case Low = 1;
    case High = 10;
}

function level(Priority $p): int
{
    return $p->value;
}

echo level(Priority::High);
