<?php

declare(strict_types=1);

function union_label(string|int $value): string|int|null
{
    return $value;
}

function union_route(): string|int|null
{
    return union_label('parity');
}
