<?php

declare(strict_types=1);

function intersection_label(Countable&Traversable $value): Countable&Traversable
{
    return $value;
}

function intersection_route(): Countable&Traversable
{
    return intersection_label(new ArrayIterator(['parity']));
}
